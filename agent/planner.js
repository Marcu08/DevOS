const fs = require("fs");
const path = require("path");

function buildPlan(task, context) {
  const topFiles = context?.topFiles || [];

  const plan = {
    task,
    steps: [],
    risk: "unknown",
    strategy: "sequential",
    filesInvolved: topFiles.slice(0, 5).map(f => f.file)
  };

  plan.steps.push({
    id: 1,
    type: "analyze",
    description: "Understand affected modules from context",
    targets: plan.filesInvolved
  });

  plan.steps.push({
    id: 2,
    type: "modify",
    description: "Apply changes based on task",
    targets: plan.filesInvolved
  });

  plan.steps.push({
    id: 3,
    type: "validate",
    description: "Run checks / simulate execution",
    command: "node index.js"
  });

  plan.steps.push({
    id: 4,
    type: "finalize",
    description: "Prepare PR output"
  });

  return plan;
}

function savePlan(plan, outputPath = "logs/plan.json") {
  fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
}

module.exports = {
  buildPlan,
  savePlan
};