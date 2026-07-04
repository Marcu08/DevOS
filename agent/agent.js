const path = require("path");
const fs = require("fs");
const DEVOS = require("./config");
const workspace = require("./workspace");
const contextModule = require("./context");
const planner = require("./planner");
const executor = require("./executor");
const state = require("./state");

function initialize() {
  const task = process.argv[2] || "analyze project";
  state.init(task);
  fs.mkdirSync(DEVOS.logs, { recursive: true });
  workspace.prepareWorkspace();
}

function runContext() {
  const ctx = contextModule.buildContext();
  fs.writeFileSync(path.join(DEVOS.logs, "context.json"), JSON.stringify(ctx, null, 2));
  state.update({
    context: {
      totalFiles: ctx.totalFiles,
      topFiles: ctx.topFiles.slice(0, 10).map(f => f.file)
    }
  });
  return ctx;
}

function runPlanner(ctx) {
  const plan = planner.buildPlan(state.get().task, ctx);
  planner.savePlan(plan, path.join(DEVOS.logs, "plan.json"));
  state.update({ plan, status: "plan_ready" });
  return plan;
}

function runExecutor(ctx) {
  return executor.generatePR(state.get().task, ctx);
}

function runValidator(pr) {
  if (!executor.validate(pr)) {
    state.update({ status: "invalid_pr" });
    return null;
  }
  return executor.selfHeal(state.get().task, pr);
}

function finish(result) {
  if (result) {
    executor.commit(result);
    state.update({ status: "committed" });
    console.log("[AGENT v0.9.2] COMMITTED");
  } else {
    state.update({ status: "failed" });
    console.log("[AGENT v0.9.2] FAILED");
  }
}

function main() {
  initialize();
  const ctx = runContext();
  runPlanner(ctx);
  const pr = runExecutor(ctx);
  const result = runValidator(pr);
  finish(result);
}

main();
