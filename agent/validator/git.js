const DEVOS = require("../config");
const { gitSafe } = require("../util/git");

function run(context) {
  const start = Date.now();

  const branch = gitSafe("rev-parse --abbrev-ref HEAD").trim();
  const status = gitSafe("status --porcelain").trim();
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
