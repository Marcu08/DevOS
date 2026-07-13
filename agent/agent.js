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
const memory = require("./memory/index");
const tools = require("./tools/index");
const state = require("./state");

const MAX_HEALING_RETRIES = DEVOS.config.validator?.retry || 3;

let healingAttempts = 0;

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

function runExecutor(ctx, errors) {
  const pr = executor.generatePR(state.getTask(), ctx, errors);
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
  const ctx = { modifiedFiles: result.modifiedFiles || [] };
  return validatorEngine.validate(ctx);
}

function executeHealing(report, result) {
  const dec = decision(report);

  if (dec === "PASS" && result) {
    memory.recordRun({
      task: state.getTask(),
      status: "completed",
      confidence: state.get().reasoning?.confidence,
      risk: state.get().reasoning?.risk,
      filesChanged: result.modifiedFiles?.length || 0,
      steps: state.get().reasoning?.steps,
    });
    memory.recordPattern(result.modifiedFiles?.join(",") || "", "modify", true);
    state.endExecution("completed");
    console.log("[AGENT v0.9.9] ALL VALIDATORS PASSED — COMMITTED");
    return true;
  }

  if (healingAttempts >= MAX_HEALING_RETRIES) {
    console.log(`[AGENT v0.9.9] MAX RETRIES (${MAX_HEALING_RETRIES}) REACHED — ROLLBACK`);
    const failedValidators = report?.validators?.filter(v => v.status === "failed") || [];
    for (const v of failedValidators) {
      memory.recordMistake(state.getTask(), `validator:${v.name}:${v.error}`, { stage: "validation", file: v.name });
      memory.recordPattern(v.name, "validate", false);
    }
    workspace.rollback();
    state.endExecution("failed");
    return false;
  }

  healingAttempts++;
  const failedValidators = report?.validators?.filter(v => v.status === "failed") || [];

  for (const v of failedValidators) {
    memory.recordMistake(state.getTask(), `${v.name}: ${v.error?.slice(0, 100)}`, { stage: "validation" });
  }

  const errorInfo = memory.learnFromFailure(
    state.getTask(),
    failedValidators.map(v => `${v.name}: ${v.error}`).join("; "),
    { file: "validation" }
  );

  console.log(`[AGENT v0.9.9] HEALING ATTEMPT ${healingAttempts}/${MAX_HEALING_RETRIES}`);
  if (errorInfo.previousAttempts.length > 0) {
    console.log(`  Previous similar errors: ${errorInfo.previousAttempts.length}`);
  }

  workspace.rollback();

  if (failedValidators.some(v => v.name === "node" || v.name === "syntax")) {
    console.log("[AGENT v0.9.9] Running pre-healing tools...");
    if (tools.available().includes("npm") && require("./tools/npm").isAvailable()) {
      tools.run("install");
    }
  }

  const ctx = runContext();
  const reasoned = runReasoning(ctx);

  if (reasoned.blocked) {
    console.log("[AGENT v0.9.9] REASONING BLOCKED AFTER RETRY");
    state.endExecution("failed");
    return false;
  }

  const plan = runPlannerFromReasoning(reasoned);
  if (!runValidator(ctx, plan)) return false;

  const healingErrors = report?.validators?.filter(v => v.status === "failed").map(v => ({ name: v.name, error: v.error })) || [];
  const newResult = runExecutor(ctx, healingErrors);
  const newReport = runValidatorEngine(newResult);
  return executeHealing(newReport, newResult);
}

function decision(report) {
  if (!report || !report.validators) return "ROLLBACK";
  const failed = report.validators.filter(v => v.status === "failed");
  if (failed.length === 0) return "PASS";

  const names = failed.map(v => v.name);
  if (names.includes("git")) return "ROLLBACK";
  return "RETRY";
}

function main() {
  initialize();
  const ctx = runContext();
  const reasoned = runReasoning(ctx);

  if (reasoned.blocked) {
    console.log("[AGENT v0.9.9] REASONING BLOCKED");
    memory.recordMistake(state.getTask(), "reasoning blocked", { stage: "reasoning" });
    state.endExecution("failed");
    return;
  }

  const plan = runPlannerFromReasoning(reasoned);

  memory.recordRun({
    task: state.getTask(),
    status: "started",
    confidence: reasoned.confidence?.confidence,
    risk: reasoned.reasoningPlan?.risk,
    steps: reasoned.reasoningPlan?.steps?.length,
  });

  if (!runValidator(ctx, plan)) {
    memory.recordMistake(state.getTask(), "plan validation failed", { stage: "planning" });
    state.endExecution("failed");
    return;
  }

  const result = runExecutor(ctx);
  const report = runValidatorEngine(result);
  executeHealing(report, result);
}

// DEPRECATED: agent/agent.js is superseded by agent/pipeline/index.js
// To run the pipeline, use cli.js or require("./agent/pipeline/index").run(task)
if (require.main === module) {
  console.warn("[DEPRECATED] agent/agent.js is deprecated. Use cli.js or agent/pipeline/ instead.");
  main();
}

module.exports = { main, initialize, runContext, runReasoning, runExecutor, runValidatorEngine };
