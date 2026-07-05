const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

function hasLinter(dir) {
  const markers = [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.yaml", ".eslintrc.yml", "eslint.config.js"];
  return markers.some(m => fs.existsSync(path.join(dir, m)));
}

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
