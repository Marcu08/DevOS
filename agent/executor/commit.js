const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");
const workspace = require("../workspace");

function run(step, context) {
  const message = step.message || `agent: ${context.task}`;

  if (context.result) {
    fs.writeFileSync(path.join(DEVOS.logs, "pr.json"), JSON.stringify(context.result, null, 2));
  }

  workspace.git("add .");
  try {
    workspace.git(`commit -m "${message}" --allow-empty`);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  return { ok: true };
}

module.exports = { run };
