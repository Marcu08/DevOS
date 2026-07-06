const path = require("path");
const DEVOS = require("../config");
const reasoningEngine = require("../reasoning/index");
const planner = require("../planner");
const state = require("../state");
const log = require("../logger").get();

function reason(ctx) {
  log.info(`Analyzing task: ${state.getTask()}`, "REASON");
  const result = reasoningEngine.reason(state.getTask(), ctx);

  state.update({
    reasoning: {
      confidence: result.confidence?.confidence,
      blocked: result.blocked,
      steps: result.reasoningPlan?.steps?.length,
      risk: result.reasoningPlan?.risk,
    }
  });

  const confidence = result.confidence?.confidence;
  const blocked = result.blocked;
  log.info(`confidence=${confidence} blocked=${blocked} steps=${result.reasoningPlan?.steps?.length} risk=${result.reasoningPlan?.risk}`, "REASON");
  return result;
}

function plan(reasoned) {
  const reasonedPlan = reasoned.reasoningPlan;
  if (!reasonedPlan) {
    log.warn("No plan in reasoning result", "PLAN");
    return null;
  }
  planner.savePlan(reasonedPlan, path.join(DEVOS.logs, "plan.json"));
  state.update({ plan: reasonedPlan, status: "plan_ready" });
  log.info(`${reasonedPlan.steps.length} steps, risk=${reasonedPlan.risk}`, "PLAN");
  return reasonedPlan;
}

module.exports = { reason, plan };
