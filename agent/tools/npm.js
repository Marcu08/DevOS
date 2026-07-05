const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");

function isAvailable() {
  return fs.existsSync(path.join(DEVOS.workspace, "package.json"));
}

function run(args = []) {
  if (!isAvailable()) return { ok: false, skipped: true, error: "No package.json found" };

  try {
    const cmd = `npm ${args.join(" ")}`;
    const out = execSync(cmd, { cwd: DEVOS.workspace, encoding: "utf-8", stdio: "pipe" });
    return { ok: true, output: out.trim() };
  } catch (e) {
    return { ok: false, output: e.stdout?.trim() || "", error: e.stderr?.slice(0, 300) || e.message };
  }
}

function install() { return run(["install"]); }
function test() { return run(["test"]); }
function build() { return run(["run", "build"]); }

module.exports = { run, install, test, build, isAvailable };
