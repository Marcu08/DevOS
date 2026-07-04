const path = require("path");
const fs = require("fs");
const DEVOS = require("./config");
const patch = require("./patch");
const state = require("./state");
const workspace = require("./workspace");

function generatePR(task, ctx) {
  const target = ctx.topFiles[0] || { file: "/index.js" };

  return {
    title: `AI: ${task}`,
    summary: "AI real diff proposal",
    risk: "unknown",
    files: [{
      path: target.file,
      patch: `@@ -1,3 +1,3 @@\n-old line\n+new line (${task})`,
      reason: `Modified for task: ${task}`
    }]
  };
}

function validate(pr) {
  if (!pr?.files?.length) return false;
  return pr.files.every(f => f.path && f.patch && f.reason);
}

function selfHeal(task, pr) {
  return patch.selfHeal(task, pr, state);
}

function commit(result) {
  fs.writeFileSync(path.join(DEVOS.logs, "pr.json"), JSON.stringify(result, null, 2));
  workspace.git("add .");
  workspace.git(`commit -m "agent: ${state.get().task}" --allow-empty`);
}

module.exports = { generatePR, validate, selfHeal, commit };
