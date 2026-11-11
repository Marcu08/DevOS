const { execSync } = require("child_process");
const DEVOS = require("../config");
const { hasLinter } = require("../util/linter");

function isAvailable() {
  return hasLinter(DEVOS.workspace);
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
