const memory = require("../memory/index");
const state = require("../state");
const workspace = require("../workspace");
const log = require("../logger").get();
const explainEngine = require("../explain/index");

const context = require("./context");
const reasoning = require("./reasoning");
const validation = require("./validation");
const execution = require("./execution");
const healing = require("./healing");
const orchestrator = require("../../agents/orchestrator");

async function run(task) {
  state.init(task);
  state.transition("Planning");

  log.info(`Starting pipeline: ${task}`, "PIPELINE");

  const ctx = await context.build();
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

async function orchestrate(task) {
  log.info("Starting multi-agent orchestration", "PIPELINE");
  state.init(task);
  state.transition("Planning");

  const ctx = await context.build();
  const result = await orchestrator.orchestrate(task, ctx);
  const decisionReport = orchestrator.createDecisionReport(result);

  const explanation = explainEngine.buildDecisionExplanation(task, result.decision, ctx, result);
  explainEngine.record(task, explanation);

  state.update({ agents: result.agents, agentDecision: result.decision });
  state.transition("Executing");

  if (result.decision === "COMMIT") {
    memory.recordRun({
      task, status: "completed",
      steps: result.summary.patchesGenerated,
    });
    const st = state.get();
    st.execution.ended = new Date().toISOString();
    st.machine = "Completed";
    state.update(st);
    log.info("ORCHESTRATION \u2014 ALL AGENTS APPROVED, COMMITTED", "PIPELINE");
    return { success: true, result: decisionReport };
  }

  if (result.decision === "ROLLBACK") {
    workspace.rollback();
    memory.recordMistake(task, `orchestration rollback: ${decisionReport.agents.filter(a => !a.approved).map(a => a.name).join(", ")}`, { stage: "orchestration" });
    const st = state.get();
    st.execution.ended = new Date().toISOString();
    st.machine = "Failed";
    state.update(st);
    return { success: false, result: decisionReport };
  }

  // RETRY — run existing healing loop
  memory.recordMistake(task, `orchestration retry: ${decisionReport.agents.filter(a => !a.approved).map(a => a.name).join(", ")}`, { stage: "orchestration" });
  const plan = { task, pr: null };
  const execResult = execution.run(plan);
  const report = validation.runEngine(execResult);
  const healed = healing.heal(report, execResult);
  return { success: healed, result: decisionReport };
}

const agents = orchestrator.available;

function reset() {
  execution.resetHealing();
}

module.exports = { run, orchestrate, agents, reset };