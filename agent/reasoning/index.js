const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");
const analyze = require("./analyze");
const plan = require("./planner");
const confidence = require("./confidence");
const reviewer = require("./reviewer");

function saveJSON(name, data) {
  fs.writeFileSync(path.join(DEVOS.logs, name), JSON.stringify(data, null, 2));
}

function reason(task, context) {
  console.log("[REASONING] Analyzing task:", task);

  const analysis = analyze.run(task, context);
  saveJSON("analysis.json", analysis);
  console.log(`  [ANALYZE] affected: ${analysis.affectedFiles.length}, priority: ${analysis.priority}`);

  const reasoningPlan = plan.run(analysis);
  saveJSON("reasoning-plan.json", reasoningPlan);
  console.log(`  [PLANNER] ${reasoningPlan.steps.length} steps, risk: ${reasoningPlan.risk}`);

  const conf = confidence.run(reasoningPlan, context);
  saveJSON("confidence.json", conf);
  console.log(`  [CONFIDENCE] ${conf.confidence} ${conf.blocked ? "(BLOCKED)" : "(OK)"}`);

  if (conf.blocked) {
    console.log(`  [CONFIDENCE] Blocked — confidence ${conf.confidence} < threshold ${conf.threshold}`);
    return { blocked: true, analysis, reasoningPlan, confidence: conf };
  }

  const review = reviewer.run(reasoningPlan, analysis);
  saveJSON("review.json", review);
  console.log(`  [REVIEWER] ${review.approved ? "APPROVED" : "ISSUES FOUND"} ${review.issues.length > 0 ? `(${review.issues.join("; ")})` : ""}`);

  return {
    blocked: !review.approved,
    analysis,
    reasoningPlan,
    confidence: conf,
    review,
    approved: review.approved,
  };
}

module.exports = { reason };
