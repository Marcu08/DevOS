const executor = require("../executor");
const validator = require("../validator");
const state = require("../state");
const log = require("../logger").get();

const MAX_HEALING_RETRIES = require("../config").config.validator?.retry || 3;

let _healingAttempts = 0;

function generateAndRun(ctx, errors) {
  const pr = executor.generatePR(state.getTask(), ctx, errors);
  const prResult = validator.validatePR(pr);
  if (!prResult.valid) {
    state.update({ status: "invalid_pr", errors: prResult.errors });
    log.warn(`Invalid PR: ${prResult.errors.join("; ")}`, "EXEC");
    return null;
  }
  const plan = { task: state.getTask(), pr };
  return executor.run(plan);
}

function decision(report) {
  if (!report || !report.validators) return "ROLLBACK";
  const failed = report.validators.filter(v => v.status === "failed");
  if (failed.length === 0) return "PASS";
  const names = failed.map(v => v.name);
  if (names.includes("git")) return "ROLLBACK";
  return "RETRY";
}

function resetHealing() { _healingAttempts = 0; }
function healingCount() { return _healingAttempts; }
function incrementHealing() { _healingAttempts++; }

module.exports = { generateAndRun, decision, resetHealing, healingCount, incrementHealing, MAX_HEALING_RETRIES };
