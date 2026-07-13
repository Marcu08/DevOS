const secrets = require("./secrets");
const dependencies = require("./dependencies");
const patterns = require("./patterns");
const permissions = require("./permissions");
const vulnerabilities = require("./vulnerabilities");
const DEVOS = require("../config");
const log = require("../logger").get();

function scanAll(context) {
  log.info("Running full security scan", "SECURITY");
  const rootDir = DEVOS.root;
  const allFindings = [];

  // Scan files from context
  const files = context.topFiles || [];
  for (const f of files) {
    const filename = f.file || "";
    const content = typeof f.content === "string" ? f.content : "";
    allFindings.push(...secrets.scan(filename, content).map(r => ({ ...r, category: "secrets" })));
    allFindings.push(...patterns.scan(filename, content).map(r => ({ ...r, category: "patterns" })));
    allFindings.push(...vulnerabilities.scan(filename, content).map(r => ({ ...r, category: "vulnerabilities" })));
  }

  // Dependency scanning
  allFindings.push(...dependencies.scanProject(rootDir).map(r => ({ ...r, category: "dependencies" })));
  allFindings.push(...dependencies.scanReferences(context).map(r => ({ ...r, category: "dependencies" })));

  // Permission scanning
  allFindings.push(...permissions.checkFilePermissions(rootDir).map(r => ({ ...r, category: "permissions" })));
  allFindings.push(...permissions.checkGitignore(rootDir).map(r => ({ ...r, category: "permissions" })));

  const result = {
    findings: allFindings,
    summary: {
      total: allFindings.length,
      critical: allFindings.filter(f => f.severity === "critical").length,
      high: allFindings.filter(f => f.severity === "high").length,
      medium: allFindings.filter(f => f.severity === "medium").length,
      low: allFindings.filter(f => f.severity === "low").length,
      info: allFindings.filter(f => f.severity === "info").length,
    },
    byCategory: {
      secrets: allFindings.filter(f => f.category === "secrets").length,
      patterns: allFindings.filter(f => f.category === "patterns").length,
      vulnerabilities: allFindings.filter(f => f.category === "vulnerabilities").length,
      dependencies: allFindings.filter(f => f.category === "dependencies").length,
      permissions: allFindings.filter(f => f.category === "permissions").length,
    },
  };

  log.info(`Security scan complete: ${result.summary.total} findings (${result.summary.critical} critical, ${result.summary.high} high)`, "SECURITY");
  return result;
}

function getDecision(result) {
  if (result.summary.critical > 0) return "ROLLBACK";
  if (result.summary.high > 0) return "RETRY";
  return "PASS";
}

module.exports = { scanAll, getDecision, secrets, dependencies, patterns, permissions, vulnerabilities };
