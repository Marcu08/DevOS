const log = require("../agent/logger").get();
const security = require("../agent/security/index");

const agent = {
  name: "security-agent",
  version: "1.0.0",

  analyze(context, task, options = {}) {
    log.info("[SECURITY] Analyzing security context", "AGENT");
    const result = security.scanAll(context, options);
    const incomplete = result.ok === false;
    const risk = incomplete || result.summary.critical > 0 ? "high" : result.summary.high > 0 ? "medium" : "low";

    return {
      task,
      filesScanned: result.filesScanned,
      risk,
      ok: result.ok,
      error: result.error,
      findings: result.findings.filter((finding) => finding.severity === "critical" || finding.severity === "high"),
      summary: result.summary,
      byCategory: result.byCategory,
    };
  },

  execute(context, analysis, options = {}) {
    log.info("[SECURITY] Running full security scan", "AGENT");
    return security.scanAll(context, options);
  },

  review(result) {
    if (!result || result.ok === false) {
      return {
        agent: agent.name,
        approved: false,
        issues: [result?.error || "Security scan could not complete"],
        decision: "ERROR",
        summary: result?.error || "Security scan could not complete",
      };
    }

    const issues = [];
    if (result.summary.critical > 0) issues.push(`${result.summary.critical} critical security issue(s) detected`);
    if (result.summary.high > 0) issues.push(`${result.summary.high} high severity issue(s) detected`);

    return {
      agent: agent.name,
      approved: result.summary.critical === 0 && result.summary.high === 0,
      issues,
      decision: security.getDecision(result),
      summary: `Found ${result.summary.total} issue(s): ${result.summary.critical} critical, ${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low`,
    };
  },
};

module.exports = agent;
