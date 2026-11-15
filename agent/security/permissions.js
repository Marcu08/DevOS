const fs = require("fs");
const path = require("path");
const { collectSourceFiles, toRelative } = require("./files");

function finding(id, severity, file, line, label, remediation) {
  return { id, severity, file, line, label, message: label, remediation };
}

function checkFilePermissions(rootDir, options = {}) {
  const findings = [];
  const collected = collectSourceFiles(rootDir, { ...options, includeEnv: true });

  if (!collected.ok) {
    throw new Error(collected.error || "Permission scan could not complete");
  }

  for (const filePath of collected.files) {
    const relative = toRelative(collected.root, filePath);
    const basename = path.basename(filePath);

    if (basename === ".env" || basename === ".env.local" || basename === ".env.production") {
      findings.push(finding(
        "permissions.env-file",
        "high",
        relative,
        0,
        "Environment file should be in .gitignore",
        "Remove the environment file from version control and keep it gitignored."
      ));
    }

    if (basename === "credentials.json" || basename === "credentials.jsonc" || basename === "service-account.json") {
      findings.push(finding(
        "permissions.credentials-file",
        "critical",
        relative,
        0,
        "Credentials file detected — should not be committed",
        "Remove the credentials file, rotate the credentials, and load them from a secret manager."
      ));
    }

    if (basename === "npm-debug.log" || basename === "yarn-error.log" || basename === "yarn-debug.log") {
      findings.push(finding(
        "permissions.debug-log",
        "low",
        relative,
        0,
        "Debug log file",
        "Remove generated debug logs and add them to .gitignore."
      ));
    }

    if (basename.endsWith(".pem") || basename.endsWith(".key") || basename.endsWith(".p12") || basename.endsWith(".cert")) {
      findings.push(finding(
        "permissions.certificate-key",
        "critical",
        relative,
        0,
        "Certificate or key file detected",
        "Remove the key material from the repository and store it in a secret manager."
      ));
    }
  }

  return findings;
}

function checkGitignore(rootDir) {
  const gitignorePath = path.join(rootDir, ".gitignore");

  if (!fs.existsSync(gitignorePath)) {
    return [finding(
      "permissions.no-gitignore",
      "medium",
      ".gitignore",
      0,
      "No .gitignore file found",
      "Add a .gitignore that excludes secrets, dependencies, and generated files."
    )];
  }

  const content = fs.readFileSync(gitignorePath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim());
  const warnings = [];
  const recommended = [".env", ".env.local", "node_modules/", "credentials.json", "*.pem", "*.key", "*.log"];

  for (const item of recommended) {
    if (!lines.includes(item) && !lines.some((line) => line.includes(item))) {
      warnings.push(finding(
        "permissions.gitignore-missing-entry",
        "low",
        ".gitignore",
        0,
        "Missing .gitignore entry",
        "Add the recommended entry to .gitignore (or confirm it is intentionally tracked)."
      ));
    }
  }

  return warnings;
}

module.exports = { checkFilePermissions, checkGitignore };
