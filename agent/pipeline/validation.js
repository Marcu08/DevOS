const validator = require("../validator");
const validatorEngine = require("../validator/index");
const state = require("../state");
const log = require("../logger").get();

function validateContext(ctx) {
  const result = validator.validateContext(ctx);
  if (result.errors.length > 0) {
    state.update({ status: "validation_failed", errors: result.errors });
    log.warn(`Context validation failed: ${result.errors.join("; ")}`, "VALIDATE");
    return false;
  }
  return true;
}

function validatePlan(plan) {
  const result = validator.validatePlan(plan);
  if (result.errors.length > 0) {
    state.update({ status: "validation_failed", errors: result.errors });
    log.warn(`Plan validation failed: ${result.errors.join("; ")}`, "VALIDATE");
    return false;
  }
  return true;
}

function validatePR(pr) {
  const result = validator.validatePR(pr);
  if (!result.valid) {
    state.update({ status: "invalid_pr", errors: result.errors });
    log.warn(`PR validation failed: ${result.errors.join("; ")}`, "VALIDATE");
    return false;
  }
  return true;
}

function runEngine(result) {
  if (!result) return null;
  state.transition("Validating");
  const ctx = { modifiedFiles: result.modifiedFiles || [] };
  const report = validatorEngine.validate(ctx);
  log.info(`${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`, "VALIDATE");
  return report;
}

module.exports = { validateContext, validatePlan, validatePR, runEngine };
