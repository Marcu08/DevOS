const fs = require("fs");
const path = require("path");

function checkFilePermissions(rootDir) {
  const findings = [];
  try {
    walkDir(rootDir, (filePath) => {
      const basename = path.basename(filePath);
      if (basename === ".env" || basename === ".env.local" || basename === ".env.production") {
        findings.push({
          file: filePath.replace(rootDir, ""),
          severity: "high",
          label: "Environment file should be in .gitignore",
        });
      }
      if (basename === "credentials.json" || basename === "credentials.jsonc" || basename === "service-account.json") {
        findings.push({
          file: filePath.replace(rootDir, ""),
          severity: "critical",
          label: "Credentials file detected — should not be committed",
        });
      }
      if (basename === "npm-debug.log" || basename === "yarn-error.log" || basename === "yarn-debug.log") {
        findings.push({
          file: filePath.replace(rootDir, ""),
          severity: "low",
          label: "Debug log file",
        });
      }
      if (basename.endsWith(".pem") || basename.endsWith(".key") || basename.endsWith(".p12") || basename.endsWith(".cert")) {
        findings.push({
          file: filePath.replace(rootDir, ""),
          severity: "critical",
          label: "Certificate or key file detected",
        });
      }
    });
  } catch (_) {}
  return findings;
}

function checkGitignore(rootDir) {
  const gitignorePath = path.join(rootDir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return [{ severity: "medium", label: "No .gitignore file found" }];
  }
  const content = fs.readFileSync(gitignorePath, "utf-8");
  const lines = content.split("\n").map(l => l.trim());
  const warnings = [];
  const recommended = [".env", ".env.local", "node_modules/", "credentials.json", "*.pem", "*.key", "*.log"];
  for (const item of recommended) {
    if (!lines.includes(item) && !lines.some(l => l.includes(item))) {
      warnings.push({ severity: "low", label: `Consider adding '${item}' to .gitignore` });
    }
  }
  return warnings;
}

function walkDir(dir, callback) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walkDir(fullPath, callback);
      } else if (entry.isFile()) {
        callback(fullPath);
      }
    }
  } catch (_) {}
}

module.exports = { checkFilePermissions, checkGitignore };
