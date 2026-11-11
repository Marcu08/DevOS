const { execSync } = require("child_process");
const DEVOS = require("../config");
const { hasLinter } = require("../util/linter");

function run(context) {
  const start = Date.now();

  if (!hasLinter(DEVOS.workspace)) {
    return { name: "lint", status: "skipped", time: Date.now() - start, error: null };
  }

  try {
    execSync("npx eslint . --no-error-on-unmatched-pattern", {
      cwd: DEVOS.workspace,
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { name: "lint", status: "passed", time: Date.now() - start, error: null };
  } catch (e) {
    return {
      name: "lint",
      status: "failed",
      time: Date.now() - start,
      error: e.stdout?.slice(0, 500) || e.message,
    };
  }
}

module.exports = { run };
