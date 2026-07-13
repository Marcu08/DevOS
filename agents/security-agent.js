const log = require("../agent/logger").get();
const security = require("../agent/security/index");

const agent = {
  name: "security-agent",
  version: "1.0.0",

  analyze(context, task) {
    log.info("[SECURITY] Analyzing security context", "AGENT");
    const result = security.scanAll(context);
    const risk = result.summary.critical > 0 ? "high" : result.summary.high > 0 ? "medium" : "low";
    return {
      task,
      filesScanned: (context.topFiles || []).length,
      risk,
      findings: result.findings.filter(f => f.severity === "critical" || f.severity === "high"),
      summary: result.summary,
      byCategory: result.byCategory,
    };
  },

  execute(context, analysis) {
    log.info("[SECURITY] Running full security scan", "AGENT");
    return security.scanAll(context);
  },

  review(result) {
    const issues = [];
    if (result.summary.critical > 0) issues.push(`${result.summary.critical} critical security issue(s) detected`);
    if (result.summary.high > 0) issues.push(`${result.summary.high} high severity issue(s) detected`);
    const approved = result.summary.critical === 0 && result.summary.high === 0;
    return {
      agent: agent.name,
      approved,
      issues,
      decision: security.getDecision(result),
      summary: `Found ${result.summary.total} issue(s): ${result.summary.critical} critical, ${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low`,
    };
  },
};

module.exports = agent;
