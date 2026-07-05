const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");

function detect() {
  const ws = DEVOS.workspace;
  if (fs.existsSync(path.join(ws, "package.json"))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(ws, "package.json"), "utf-8"));
    const scripts = pkg.scripts || {};
    if (scripts.test) return { framework: "npm", command: "npm test" };
    if (scripts.jest) return { framework: "jest", command: "npx jest" };
  }
  if (fs.existsSync(path.join(ws, "jest.config.js"))) return { framework: "jest", command: "npx jest" };
  if (fs.existsSync(path.join(ws, "vitest.config.js")) || fs.existsSync(path.join(ws, "vitest.config.ts"))) {
    return { framework: "vitest", command: "npx vitest run" };
  }
  return null;
}

function run(args = []) {
  const config = detect();
  if (!config) return { ok: false, skipped: true, error: "No test framework detected" };

  try {
    const cmd = `${config.command} ${args.join(" ")}`;
    const out = execSync(cmd, { cwd: DEVOS.workspace, encoding: "utf-8", stdio: "pipe" });
    return { ok: true, framework: config.framework, output: out.trim() };
  } catch (e) {
    return { ok: false, framework: config.framework, output: e.stdout?.trim() || "", error: e.stderr?.slice(0, 300) || e.message };
  }
}

module.exports = { run, detect };
