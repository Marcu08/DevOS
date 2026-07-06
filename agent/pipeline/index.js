const memory = require("../memory/index");
const state = require("../state");
const log = require("../logger").get();

const context = require("./context");
const reasoning = require("./reasoning");
const validation = require("./validation");
const execution = require("./execution");
const healing = require("./healing");

function run(task) {
  state.init(task);
  state.transition("Planning");

  log.info(`Starting pipeline: ${task}`, "PIPELINE");

  const ctx = context.build();
  const reasoned = reasoning.reason(ctx);

  if (reasoned.blocked) {
    log.warn("REASONING BLOCKED", "PIPELINE");
    memory.recordMistake(task, "reasoning blocked", { stage: "reasoning" });
    state.endExecution("failed");
    return false;
  }

  const plan = reasoning.plan(reasoned);
  if (!plan) {
    log.warn("No plan generated", "PIPELINE");
    state.endExecution("failed");
    return false;
  }

  memory.recordRun({
    task, status: "started",
    confidence: reasoned.confidence?.confidence,
    risk: reasoned.reasoningPlan?.risk,
    steps: reasoned.reasoningPlan?.steps?.length,
  });

  if (!validation.validateContext(ctx) || !validation.validatePlan(plan)) {
    memory.recordMistake(task, "plan validation failed", { stage: "planning" });
    state.endExecution("failed");
    return false;
  }

  state.transition("Executing");
  const result = execution.generateAndRun(ctx);
  const report = validation.runEngine(result);
  return healing.heal(report, result);
}

function reset() {
  execution.resetHealing();
}

module.exports = { run, reset };
