const path = require("path");
const fs = require("fs");
const DEVOS = require("./config");
const workspace = require("./workspace");
const contextModule = require("./context");
const planner = require("./planner");
const executor = require("./executor");
const validator = require("./validator");
const state = require("./state");

function initialize() {
  const task = process.argv[2] || "analyze project";
  state.init(task);
  state.transition("Planning");
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
  const plan = planner.buildPlan(state.getTask(), ctx);
  planner.savePlan(plan, path.join(DEVOS.logs, "plan.json"));
  state.update({ plan, status: "plan_ready" });
  return plan;
}

function runValidator(ctx, plan) {
  const ctxResult = validator.validateContext(ctx);
  const planResult = validator.validatePlan(plan);

  const allErrors = [...ctxResult.errors, ...planResult.errors];
  if (allErrors.length > 0) {
    state.update({ status: "validation_failed", errors: allErrors });
    console.log("[VALIDATOR] FAILED:", allErrors.join("; "));
    return false;
  }

  return true;
}

function runExecutor(ctx) {
  const pr = executor.generatePR(state.getTask(), ctx);

  const prResult = validator.validatePR(pr);
  if (!prResult.valid) {
    state.update({ status: "invalid_pr", errors: prResult.errors });
    console.log("[EXECUTOR] Invalid PR:", prResult.errors.join("; "));
    return null;
  }

  const plan = { task: state.getTask(), pr };
  return executor.run(plan);
}

function finish(result) {
  if (result) {
    state.endExecution("completed");
    console.log("[AGENT v0.9.3] COMMITTED");
  } else {
    state.endExecution("failed");
    console.log("[AGENT v0.9.3] FAILED");
  }
}

function main() {
  initialize();
  const ctx = runContext();
  const plan = runPlanner(ctx);

  if (!runValidator(ctx, plan)) return;

  const result = runExecutor(ctx);
  finish(result);
}

main();
