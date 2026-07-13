const fs = require("fs");
const path = require("path");

const UNSAFE_PACKAGES = [
  { name: "eval", reason: "Dynamic code execution" },
  { name: "child_process", reason: "Shell execution" },
  { name: "vm", reason: "Sandbox escape risk" },
  { name: "worker_threads", reason: "Unrestricted threading" },
];

const UNSAFE_SCRIPTS = [
  /(?:rm\s+-rf|rmdir\s+\/s|del\s+\/f)/i,
  /(?:curl|wget)\s+.+[|;]/i,
  /(?:chmod\s+777|chmod\s+a\+w)/i,
];

function scanProject(rootDir) {
  const findings = [];

  // Check package.json
  const pkgPath = path.join(rootDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [dep, ver] of Object.entries(allDeps)) {
        for (const unsafe of UNSAFE_PACKAGES) {
          if (dep === unsafe.name) {
            findings.push({ file: "package.json", line: 0, severity: "high", label: `Unsafe dependency: ${dep} — ${unsafe.reason}`, snippet: `${dep}: "${ver}"` });
          }
        }
        if (ver && (ver.includes(">") || ver.includes("*"))) {
          findings.push({ file: "package.json", line: 0, severity: "low", label: `Loose version constraint: ${dep}`, snippet: `${dep}: "${ver}"` });
        }
      }
    } catch (_) {}
  }

  // Check scripts in package.json
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allScripts = { ...pkg.scripts };
      for (const [name, script] of Object.entries(allScripts)) {
        if (!script) continue;
        for (const pattern of UNSAFE_SCRIPTS) {
          if (pattern.test(script)) {
            findings.push({ file: "package.json", line: 0, severity: "high", label: `Unsafe script: ${name}`, snippet: script.slice(0, 100) });
          }
        }
      }
    } catch (_) {}
  }

  return findings;
}

function scanReferences(context) {
  const findings = [];
  const depMap = context.dependencyMap || {};
  for (const [file, deps] of Object.entries(depMap)) {
    for (const dep of (deps || [])) {
      if (dep && typeof dep === "string") {
        for (const unsafe of UNSAFE_PACKAGES) {
          if (dep.includes(unsafe.name)) {
            findings.push({ file, line: 0, severity: "medium", label: `Unsafe reference: ${unsafe.reason}`, snippet: dep.slice(0, 100) });
          }
        }
      }
    }
  }
  return findings;
}

module.exports = { scanProject, scanReferences };
