const workspace = require("../workspace");

function run(step, context) {
  console.log("[ROLLBACK] git reset --hard");
  workspace.rollback();
  return { ok: true };
}

module.exports = { run };
