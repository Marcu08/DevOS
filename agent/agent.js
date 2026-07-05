const path = require("path");
const fs = require("fs");
const DEVOS = require("./config");
const workspace = require("./workspace");
const contextModule = require("./context");
const planner = require("./planner");
const executor = require("./executor");
const validator = require("./validator");
const validatorEngine = require("./validator/index");
const reasoning = require("./reasoning/index");
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

function runReasoning(ctx) {
  const result = reasoning.reason(state.getTask(), ctx);

  state.update({
    reasoning: {
      confidence: result.confidence?.confidence,
      blocked: result.blocked,
      steps: result.reasoningPlan?.steps?.length,
      risk: result.reasoningPlan?.risk,
    }
  });

  return result;
}

function runPlannerFromReasoning(reasoned) {
  const reasonedPlan = reasoned.reasoningPlan;
  if (reasonedPlan) {
    planner.savePlan(reasonedPlan, path.join(DEVOS.logs, "plan.json"));
    state.update({ plan: reasonedPlan, status: "plan_ready" });
  }
  return reasonedPlan;
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

function runValidatorEngine(result) {
  if (!result) return null;
  state.transition("Validating");
  const context = { modifiedFiles: result.modifiedFiles || [] };
  return validatorEngine.validate(context);
}

function decision(report) {
  if (!report) return "ROLLBACK";

  const failed = report.validators.filter(v => v.status === "failed");

  if (failed.length === 0) return "PASS";

  const names = failed.map(v => v.name);

  if (names.includes("git")) return "ROLLBACK";
  if (names.includes("syntax")) return "RETRY";
  if (names.includes("node")) return "RETRY";

  return "ROLLBACK";
}

function executeDecision(dec, result) {
  if (dec === "PASS" && result) {
    state.endExecution("completed");
    console.log("[AGENT v0.9.5] ALL VALIDATORS PASSED — COMMITTED");
    return;
  }

  if (dec === "RETRY") {
    console.log("[AGENT v0.9.5] VALIDATION FAILED — RETRYING");
    workspace.rollback();
    const ctx = runContext();
    const reasonedAgain = runReasoning(ctx);
    if (reasonedAgain.blocked) { console.log("[AGENT v0.9.5] RETRY BLOCKED — confidence too low"); return; }
    const planAgain = runPlannerFromReasoning(reasonedAgain);
    if (!planAgain || !runValidator(ctx, planAgain)) return;
    const newResult = runExecutor(ctx);
    const newReport = runValidatorEngine(newResult);
    executeDecision(decision(newReport), newResult);
    return;
  }

  if (dec === "ROLLBACK") {
    console.log("[AGENT v0.9.5] VALIDATION FAILED — ROLLBACK");
    workspace.rollback();
    state.endExecution("failed");
  }
}

function main() {
  initialize();
  const ctx = runContext();

  const reasoned = runReasoning(ctx);
  if (reasoned.blocked) {
    console.log("[AGENT v0.9.5] REASONING BLOCKED — confidence too low or review failed");
    state.endExecution("failed");
    return;
  }

  const plan = runPlannerFromReasoning(reasoned);
  if (!runValidator(ctx, plan)) return;

  const result = runExecutor(ctx);
  const report = runValidatorEngine(result);
  const dec = decision(report);
  executeDecision(dec, result);
}

main();
