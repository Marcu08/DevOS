const path = require("path");
const fs = require("fs");
const DEVOS = require("./config");
const state = require("./state");

const ACTIONS_DIR = __dirname + "/executor";

function loadAction(name) {
  try {
    return require(path.join(ACTIONS_DIR, name));
  } catch {
    return null;
  }
}

function generatePR(task, ctx) {
  const target = ctx.topFiles[0] || { file: "/index.js" };

  return {
    title: `AI: ${task}`,
    summary: "AI real diff proposal",
    risk: "unknown",
    files: [{
      path: target.file,
      patch: `@@ -1,3 +1,3 @@\n-old line\n+new line (${task})`,
      reason: `Modified for task: ${task}`
    }]
  };
}

function buildQueue(task, pr) {
  const context = { task, pr, result: null };

  const steps = [
    { action: "validate", label: "Validate PR", type: "pr", retryPolicy: { maxRetries: 0, retryOn: [] } },
    { action: "applyPatch", label: "Apply patches", retryPolicy: { maxRetries: 2, retryOn: ["validation"] } },
    { action: "runChecks", label: "Run validation checks", retryPolicy: { maxRetries: 2, retryOn: ["timeout"] } },
    { action: "validate", label: "Final validation", type: "checks", retryPolicy: { maxRetries: 0, retryOn: [] } },
    { action: "commit", label: "Git commit", retryPolicy: { maxRetries: 1, retryOn: ["timeout"] } },
  ];

  return { context, steps };
}

function saveExecutionLog(execution) {
  fs.writeFileSync(path.join(DEVOS.logs, "execution.json"), JSON.stringify(execution, null, 2));
}

function run(plan) {
  const task = state.getTask();
  const pr = plan.pr;

  const { context, steps: definitions } = buildQueue(task, pr);

  state.startExecution();

  const execution = {
    started: new Date().toISOString(),
    ended: null,
    status: "running",
    steps: [],
  };

  saveExecutionLog(execution);

  for (const def of definitions) {
    const step = state.addStep(def);
    step.started = new Date().toISOString();
    step.status = "running";
    state.updateStep(step.id, { status: "running", started: step.started });
    state.transition("Executing");

    const action = loadAction(def.action);

    if (!action) {
      step.status = "failed";
      step.error = `Action not found: ${def.action}`;
      state.updateStep(step.id, { status: "failed", error: step.error, ended: new Date().toISOString() });
      execution.steps.push({ ...step });
      saveExecutionLog(execution);
      return null;
    }

    let result = null;
    let attempts = 0;
    const maxRetries = def.retryPolicy.maxRetries;

    while (attempts <= maxRetries) {
      attempts++;
      if (attempts > 1) {
        console.log(`[RETRY] Step ${step.id} (${def.action}) attempt ${attempts}/${maxRetries + 1}`);
        step.retries++;
        state.updateStep(step.id, { retries: step.retries });
      }

      result = action.run(step, context);

      if (result.ok) break;

      if (attempts <= maxRetries && def.retryPolicy.retryOn.some(r => result.error?.includes(r))) {
        const rollbackAction = loadAction("rollback");
        if (rollbackAction) {
          rollbackAction.run(step, context);
        }
        continue;
      }

      break;
    }

    if (result?.ok) {
      step.status = "completed";
      step.ended = new Date().toISOString();
      state.updateStep(step.id, { status: "completed", ended: step.ended });
    } else {
      step.status = "failed";
      step.error = result?.error || "Unknown error";
      step.ended = new Date().toISOString();
      state.updateStep(step.id, { status: "failed", error: step.error, ended: step.ended });

      const rollbackAction = loadAction("rollback");
      if (rollbackAction) {
        rollbackAction.run(step, context);
      }

      execution.steps.push({ ...step });
      saveExecutionLog(execution);
      return null;
    }

    execution.steps.push({ ...step });
    saveExecutionLog(execution);
  }

  context.result = { pr, branch: state.get().branch };

  execution.ended = new Date().toISOString();
  execution.status = "completed";
  saveExecutionLog(execution);

  return context.result;
}

module.exports = { generatePR, buildQueue, run };
