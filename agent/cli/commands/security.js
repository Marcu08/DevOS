const out = require("../output");
const security = require("../../security/index");
const context = require("../../pipeline/context");

function handler() {
  out.banner("Security Scan");

  const ctx = context.build();
  const result = security.scanAll(ctx);
  const decision = security.getDecision(result);

  out.status(result.summary.critical === 0 ? "ok" : "fail", result.summary.critical === 0 ? "ok" : "fail", `Findings: ${result.summary.total}`);
  out.status("info", "ok", `Critical: ${result.summary.critical}`);
  out.status("info", "ok", `High: ${result.summary.high}`);
  out.status("info", "ok", `Medium: ${result.summary.medium}`);
  out.status("info", "ok", `Low: ${result.summary.low}`);
  out.status("info", "ok", `Info: ${result.summary.info}`);
  out.divider();
  out.info("By Category:");
  for (const [cat, count] of Object.entries(result.byCategory)) {
    out.status("info", "ok", `${cat}: ${count}`);
  }
  out.divider();
  const decColor = decision === "PASS" ? "green" : decision === "RETRY" ? "yellow" : "red";
  out.info(`Security Decision: ${out.colorize(decision, decColor)}`);

  if (result.findings.length > 0) {
    out.divider();
    out.info("Top Findings:");
    for (const f of result.findings.slice(0, 10)) {
      out.status(f.severity === "critical" ? "fail" : "warning", f.severity === "critical" ? "fail" : "warning", `${f.severity.toUpperCase()}: ${f.label} (${f.file}:${f.line})`);
    }
  }
}

module.exports = { handler, description: "Run security scan on the current project" };
