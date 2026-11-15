const path = require("path");
const DEVOS = require("../config");
const log = require("../logger").get();
const secrets = require("./secrets");
const dependencies = require("./dependencies");
const patterns = require("./patterns");
const permissions = require("./permissions");
const vulnerabilities = require("./vulnerabilities");
const { collectSourceFiles, normalizeRelativePath, readSourceFile, toRelative } = require("./files");
const { getFindingMetadata, SUPPORTED_SEVERITIES } = require("./finding-metadata");

const SCANNERS = [
  { category: "secrets", module: secrets },
  { category: "patterns", module: patterns },
  { category: "vulnerabilities", module: vulnerabilities },
];

function normalizeFinding(finding, category) {
  // Labels and remediation come only from trusted static rule metadata. Raw
  // scanner-provided text is never copied into findings.
  const id = typeof finding.id === "string" && finding.id ? finding.id : `${category}.unknown`;
  const metadata = getFindingMetadata(id);
  const severity = SUPPORTED_SEVERITIES.has(finding.severity) ? finding.severity : "info";

  return {
    id,
    severity,
    file: finding.file || "",
    line: Number.isInteger(finding.line) && finding.line > 0 ? finding.line : 0,
    label: metadata.label,
    message: metadata.label,
    remediation: metadata.remediation,
    category,
  };
}

function emptyResult(error, errors = []) {
  return {
    ok: false,
    error,
    errors,
    filesScanned: 0,
    filesSkipped: [],
    findings: [],
    criticalCount: 0,
    highCount: 0,
    totalFindings: 0,
    summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    byCategory: { secrets: 0, patterns: 0, vulnerabilities: 0, dependencies: 0, permissions: 0 },
  };
}

function scanAll(context = {}, options = {}) {
  log.info("Running full security scan", "SECURITY");

  const config = DEVOS.config.security || {};
  const root = path.resolve(options.root || context.root || DEVOS.root);
  const maxFiles = options.maxFiles ?? config.maxFiles ?? 2000;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? config.maxFileSizeBytes ?? 1024 * 1024;

  // Exclude the generated DevOS workspace only when it is actually inside the
  // scan root. The full relative path is used so nested workspaces exclude only
  // their own subtree; a sibling source directory is still scanned.
  // options.workspace is used by tests/tools; production uses DEVOS.workspace.
  const workspacePath = path.resolve(options.workspace || DEVOS.workspace);
  const workspaceRelative = path.relative(root, workspacePath);
  const workspaceOutsideRoot =
    workspaceRelative === "" ||
    path.isAbsolute(workspaceRelative) ||
    workspaceRelative === ".." ||
    workspaceRelative.startsWith(`..${path.sep}`);

  const runtimeExcludePaths = workspaceOutsideRoot ? [] : [normalizeRelativePath(workspaceRelative)];
  const excludePaths = [
    ...(config.excludePaths || []),
    ...(options.excludePaths || []),
    ...runtimeExcludePaths,
  ];
  const exclude = [...(config.exclude || []), ...(options.exclude || [])];

  const collected = collectSourceFiles(root, { maxFiles, exclude, excludePaths, includeEnv: true });
  if (!collected.ok) {
    log.warn(`Security scan could not complete: ${collected.error}`, "SECURITY");
    return emptyResult(collected.error, collected.errors);
  }

  const findings = [];
  const errors = [...collected.errors];
  const filesSkipped = [...collected.skipped];
  let filesScanned = 0;

  for (const filePath of collected.files) {
    const relative = toRelative(collected.root, filePath);
    const read = readSourceFile(filePath, {
      maxFileSizeBytes,
    });

    if (read.skipped) {
      filesSkipped.push({ file: relative, reason: read.reason });
      continue;
    }

    if (read.error) {
      errors.push({ file: relative, error: read.error });
      continue;
    }

    filesScanned++;

    for (const scanner of SCANNERS) {
      try {
        const scannerFindings = scanner.module.scan(relative, read.content);
        findings.push(...scannerFindings.map((finding) => normalizeFinding(finding, scanner.category)));
      } catch (error) {
        errors.push({
          file: relative,
          scanner: scanner.category,
          error: `Scanner "${scanner.category}" failed while scanning this file`,
        });
      }
    }
  }

  try {
    findings.push(...dependencies.scanProject(collected.root).map((finding) => normalizeFinding(finding, "dependencies")));
  } catch {
    errors.push({
      file: "package.json",
      scanner: "dependencies",
      error: "Dependency manifest scan failed",
    });
  }

  try {
    findings.push(...dependencies.scanReferences(context || {}).map((finding) => normalizeFinding(finding, "dependencies")));
  } catch {
    errors.push({
      file: "",
      scanner: "dependencies",
      error: "Dependency reference scan failed",
    });
  }

  try {
    findings.push(...permissions.checkFilePermissions(collected.root, { exclude, excludePaths, maxFiles }).map((finding) => normalizeFinding(finding, "permissions")));
  } catch {
    errors.push({
      file: "",
      scanner: "permissions",
      error: "Permission file scan failed",
    });
  }

  try {
    findings.push(...permissions.checkGitignore(collected.root).map((finding) => normalizeFinding(finding, "permissions")));
  } catch {
    errors.push({
      file: ".gitignore",
      scanner: "permissions",
      error: "Gitignore scan failed",
    });
  }

  const ok = errors.length === 0;
  const result = {
    ok,
    error: ok ? null : `Security scan could not complete: ${errors[0].error}`,
    errors,
    filesScanned,
    filesSkipped,
    findings,
    criticalCount: findings.filter((finding) => finding.severity === "critical").length,
    highCount: findings.filter((finding) => finding.severity === "high").length,
    totalFindings: findings.length,
    summary: {
      total: findings.length,
      critical: findings.filter((finding) => finding.severity === "critical").length,
      high: findings.filter((finding) => finding.severity === "high").length,
      medium: findings.filter((finding) => finding.severity === "medium").length,
      low: findings.filter((finding) => finding.severity === "low").length,
      info: findings.filter((finding) => finding.severity === "info").length,
    },
    byCategory: {
      secrets: findings.filter((finding) => finding.category === "secrets").length,
      patterns: findings.filter((finding) => finding.category === "patterns").length,
      vulnerabilities: findings.filter((finding) => finding.category === "vulnerabilities").length,
      dependencies: findings.filter((finding) => finding.category === "dependencies").length,
      permissions: findings.filter((finding) => finding.category === "permissions").length,
    },
  };

  log.info(
    `Security scan ${ok ? "complete" : "incomplete"}: ${result.summary.total} findings (${result.summary.critical} critical, ${result.summary.high} high), ${filesScanned} files scanned, ${filesSkipped.length} skipped`,
    "SECURITY"
  );

  return result;
}

function getDecision(result) {
  if (!result || result.ok === false) return "ERROR";
  if (result.summary.critical > 0) return "ROLLBACK";
  if (result.summary.high > 0) return "RETRY";
  return "PASS";
}

module.exports = { scanAll, getDecision, secrets, dependencies, patterns, permissions, vulnerabilities };
