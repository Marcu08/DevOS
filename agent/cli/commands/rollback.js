const out = require("../output");

function handler() {
  out.banner("Workspace Rollback");

  out.status("git reset --hard", "running");
  out.status("git clean -fd", "running");
  console.log("");

  try {
    require("../../workspace").rollback();
    out.status("git reset --hard", "ok");
    out.status("git clean -fd", "ok");
    out.divider();
    out.success("Workspace rolled back to last clean state");
  } catch (e) {
    out.status("git reset --hard", "fail");
    out.status("git clean -fd", "skip");
    out.divider();
    out.error(`Rollback failed: ${e.message}`);
  }
  console.log("");
}

module.exports = { handler, description: "Roll back the workspace to the last clean state" };
