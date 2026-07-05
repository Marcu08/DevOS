const { execSync } = require("child_process");
const DEVOS = require("../config");

function run(context) {
  const start = Date.now();

  function git(cmd) {
    try {
      return execSync(`git ${cmd}`, { cwd: DEVOS.workspace, encoding: "utf-8", stdio: "pipe" });
    } catch {
      return "";
    }
  }

  const branch = git("rev-parse --abbrev-ref HEAD").trim();
  const status = git("status --porcelain").trim();
  const hasConflicts = status.includes("UU ");

  const data = {
    branch,
    clean: status.length === 0,
    conflicts: hasConflicts,
    modifiedCount: status ? status.split("\n").length : 0,
  };

  const passed = data.branch && data.clean && !data.conflicts;

  return {
    name: "git",
    status: passed ? "passed" : "failed",
    time: Date.now() - start,
    error: passed ? null : `Branch: ${data.branch}, Clean: ${data.clean}, Conflicts: ${data.conflicts}`,
    data,
  };
}

module.exports = { run };
