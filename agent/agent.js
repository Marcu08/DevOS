const path = require("path");
const fs = require("fs");
const { buildContext } = require("./context");
const { buildPlan, savePlan } = require("./planner");
const config = require("./config");
const workspace = require("./workspace");
const patch = require("./patch");
const state = require("./state");

const LOGS = path.join(config.get("root"), "logs");

const task = process.argv[2] || "analyze project";

state.init(task);
fs.mkdirSync(LOGS, { recursive: true });

workspace.prepareWorkspace();

const context = buildContext();
fs.writeFileSync(path.join(LOGS, "context.json"), JSON.stringify(context, null, 2));

state.update({
  context: {
    totalFiles: context.totalFiles,
    topFiles: context.topFiles.slice(0, 10).map(f => f.file)
  }
});

const plan = buildPlan(task, context);
savePlan(plan, path.join(LOGS, "plan.json"));
state.update({ plan, status: "plan_ready" });

const target = context.topFiles[0] || { file: "/index.js" };
const pr = {
  title: `AI: ${task}`,
  summary: "AI real diff proposal",
  risk: "unknown",
  files: [{
    path: target.file,
    patch: `@@ -1,3 +1,3 @@\n-old line\n+new line (${task})`,
    reason: `Modified for task: ${task}`
  }]
};

if (!patch.validatePR(pr)) {
  console.log("[AGENT] Invalid PR");
  state.update({ status: "invalid_pr" });
  process.exit(1);
}

const result = patch.selfHeal(task, pr, state);

if (result) {
  fs.writeFileSync(path.join(LOGS, "pr.json"), JSON.stringify(result, null, 2));
  workspace.git("add .");
  workspace.git(`commit -m "agent: ${pr.title}" --allow-empty`);
  state.update({ status: "committed" });
  console.log("[AGENT v0.9.1] COMMITTED");
} else {
  state.update({ status: "failed" });
  console.log("[AGENT v0.9.0] FAILED");
}
