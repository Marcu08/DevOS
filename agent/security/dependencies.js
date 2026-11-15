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

function finding(id, severity, file, line, label, remediation) {
  return { id, severity, file, line, label, message: label, remediation };
}

function scanProject(rootDir) {
  const findings = [];
  const pkgPath = path.join(rootDir, "package.json");

  let manifestStat;
  try {
    manifestStat = fs.lstatSync(pkgPath);
  } catch (error) {
    if (error.code === "ENOENT") return findings;
    throw new Error("Dependency manifest could not be inspected");
  }

  if (manifestStat.isSymbolicLink()) {
    throw new Error("Dependency manifest must not be a symbolic link");
  }

  if (!manifestStat.isFile()) {
    throw new Error("Dependency manifest is not a regular file");
  }

  let raw;
  try {
    raw = fs.readFileSync(pkgPath, "utf-8");
  } catch {
    throw new Error("Dependency manifest could not be read or parsed");
  }

  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch {
    throw new Error("Dependency manifest could not be read or parsed");
  }

  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) {
    throw new Error("Dependency manifest has an invalid structure");
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [dep, ver] of Object.entries(allDeps)) {
    for (const unsafe of UNSAFE_PACKAGES) {
      if (dep === unsafe.name) {
        findings.push(finding(
          "dependencies.unsafe-package",
          "high",
          "package.json",
          0,
          "Unsafe dependency",
          "Remove or isolate the unsafe dependency and use a safer alternative."
        ));
      }
    }

    if (ver && (ver.includes(">") || ver.includes("*"))) {
      findings.push(finding(
        "dependencies.loose-version",
        "low",
        "package.json",
        0,
        "Loose dependency version constraint",
        "Pin dependencies or use a bounded semver range."
      ));
    }
  }

  const allScripts = { ...pkg.scripts };
  for (const [name, script] of Object.entries(allScripts)) {
    if (!script) continue;

    for (const pattern of UNSAFE_SCRIPTS) {
      if (pattern.test(script)) {
        findings.push(finding(
          "dependencies.unsafe-script",
          "high",
          "package.json",
          0,
          "Unsafe package script",
          "Avoid destructive or network-piped shell commands in package scripts."
        ));
      }
    }
  }

  return findings;
}

function scanReferences(context) {
  const findings = [];
  const depMap = context.dependencyMap || {};

  for (const [file, deps] of Object.entries(depMap)) {
    for (const dep of (deps || [])) {
      if (!dep || typeof dep !== "string") continue;

      for (const unsafe of UNSAFE_PACKAGES) {
        if (dep.includes(unsafe.name)) {
          findings.push(finding(
            "dependencies.unsafe-reference",
            "medium",
            file,
            0,
            "Unsafe dependency reference",
            "Verify the dependency is necessary and isolate privileged operations."
          ));
        }
      }
    }
  }

  return findings;
}

module.exports = { scanProject, scanReferences };
