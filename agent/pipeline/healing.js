const workspace = require("../workspace");
const memory = require("../memory/index");
const tools = require("../tools/index");
const state = require("../state");
const context = require("./context");
const reasoning = require("./reasoning");
const validation = require("./validation");
const execution = require("./execution");
const log = require("../logger").get();

function heal(report, result) {
  const dec = execution.decision(report);

  if (dec === "PASS" && result) {
    memory.recordRun({
      task: state.getTask(), status: "completed",
      confidence: state.get().reasoning?.confidence,
      risk: state.get().reasoning?.risk,
      filesChanged: result.modifiedFiles?.length || 0,
      steps: state.get().reasoning?.steps,
    });
    memory.recordPattern(result.modifiedFiles?.join(",") || "", "modify", true);
    state.endExecution("completed");
    log.info("ALL VALIDATORS PASSED — COMMITTED", "AGENT");
    return true;
  }

  if (execution.healingCount() >= execution.MAX_HEALING_RETRIES) {
    log.warn(`MAX RETRIES (${execution.MAX_HEALING_RETRIES}) REACHED — ROLLBACK`, "AGENT");
    const failedValidators = report?.validators?.filter(v => v.status === "failed") || [];
    for (const v of failedValidators) {
      memory.recordMistake(state.getTask(), `validator:${v.name}:${v.error}`, { stage: "validation", file: v.name });
      memory.recordPattern(v.name, "validate", false);
    }
    workspace.rollback();
    state.endExecution("failed");
    return false;
  }

  execution.incrementHealing();

  const failed = report?.validators?.filter(v => v.status === "failed") || [];
  for (const v of failed) {
    memory.recordMistake(state.getTask(), `${v.name}: ${v.error?.slice(0, 100)}`, { stage: "validation" });
  }
  memory.learnFromFailure(
    state.getTask(),
    failed.map(v => `${v.name}: ${v.error}`).join("; "),
    { file: "validation" }
  );

  log.info(`HEALING ATTEMPT ${execution.healingCount()}/${execution.MAX_HEALING_RETRIES}`, "AGENT");

  workspace.rollback();

  if (failed.some(v => v.name === "node" || v.name === "syntax")) {
    log.info("Running pre-healing tools...", "AGENT");
    if (tools.available().includes("npm") && require("../tools/npm").isAvailable()) {
      tools.run("install");
    }
  }

  const ctx = context.build();
  const reasoned = reasoning.reason(ctx);

  if (reasoned.blocked) {
    log.warn("REASONING BLOCKED AFTER RETRY", "AGENT");
    state.endExecution("failed");
    return false;
  }

  const plan = reasoning.plan(reasoned);
  if (!plan || !validation.validateContext(ctx) || !validation.validatePlan(plan)) return false;

  const healingErrors = failed.map(v => ({ name: v.name, error: v.error }));
  const newResult = execution.generateAndRun(ctx, healingErrors);
  const newReport = validation.runEngine(newResult);
  return heal(newReport, newResult);
}

module.exports = { heal };
