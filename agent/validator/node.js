const { execSync } = require("child_process");
const DEVOS = require("../config");

function run(context) {
  const start = Date.now();
  const cmd = DEVOS.config.validator?.command || "node index.js";

  try {
    execSync(cmd, { cwd: DEVOS.workspace, encoding: "utf-8", stdio: "pipe" });
    return { name: "node", status: "passed", time: Date.now() - start, error: null };
  } catch (e) {
    return {
      name: "node",
      status: "failed",
      time: Date.now() - start,
      error: e.stderr?.slice(0, 300) || e.message,
    };
  }
}

module.exports = { run };
