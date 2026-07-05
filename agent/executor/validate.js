const validator = require("../validator");
const patch = require("../patch");

function run(step, context) {
  if (step.type === "pr") {
    const result = validator.validatePR(context.pr);
    if (!result.valid) {
      return { ok: false, error: result.errors.join("; ") };
    }
  }

  if (step.type === "checks") {
    const result = patch.runChecks();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
  }

  return { ok: true };
}

module.exports = { run };
