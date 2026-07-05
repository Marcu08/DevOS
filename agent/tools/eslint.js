const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

function isAvailable() {
  const markers = [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.yaml", "eslint.config.js"];
  return markers.some(m => fs.existsSync(path.join(DEVOS.workspace, m)));
}

function run(args = []) {
  if (!isAvailable()) return { ok: false, skipped: true, error: "No ESLint configuration found" };

  try {
    const cmd = `npx eslint ${args.join(" ")} --no-error-on-unmatched-pattern`;
    const out = execSync(cmd, { cwd: DEVOS.workspace, encoding: "utf-8", stdio: "pipe" });
    return { ok: true, output: out.trim() };
  } catch (e) {
    return { ok: false, output: e.stdout?.trim() || "", error: e.stderr?.slice(0, 300) || e.message };
  }
}

module.exports = { run, isAvailable };
