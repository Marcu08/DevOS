const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

function run(context) {
  const start = Date.now();
  const cmd = DEVOS.config.validator?.command || "node index.js";
  const targetFile = cmd.replace(/^node\s+/, "").trim();

  if (targetFile) {
    const fullPath = path.join(DEVOS.workspace, targetFile);
    if (!fs.existsSync(fullPath)) {
      return { name: "node", status: "skipped", time: Date.now() - start, error: `${targetFile} not found` };
    }
  }

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
