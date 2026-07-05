const { execSync } = require("child_process");
const DEVOS = require("../config");

function run() {
  const results = [];

  const checks = [
    { name: "git", cmd: "git --version" },
    { name: "node", cmd: "node --version" },
    { name: "npm", cmd: "npm --version" },
    { name: "workspace", cmd: "git rev-parse --abbrev-ref HEAD", cwd: DEVOS.workspace },
  ];

  for (const check of checks) {
    try {
      const out = execSync(check.cmd, { encoding: "utf-8", cwd: check.cwd || DEVOS.root, stdio: "pipe" });
      results.push({ name: check.name, status: "ok", version: out.trim() });
    } catch {
      results.push({ name: check.name, status: "missing" });
    }
  }

  const allOk = results.every(r => r.status === "ok");
  return { ok: allOk, checks: results };
}

module.exports = { run };
