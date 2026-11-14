module.exports = function test(assert) {
  const validator = require("../agent/validator/plan");

  assert.ok(typeof validator.validatePlan === "function", "validatePlan should be exported");
  assert.ok(typeof validator.validatePR === "function", "validatePR should be exported");
  assert.ok(typeof validator.validateContext === "function", "validateContext should be exported");

  assert.equal(validator.validatePlan(null).valid, false, "null plan should be invalid");
  assert.ok(
    validator.validatePlan({ task: "task", steps: [], filesInvolved: ["agent/config.js"] }).valid,
    "a complete plan should be valid"
  );
  assert.equal(
    validator.validatePlan({ task: "task", steps: [] }).valid,
    false,
    "a plan without files should be invalid"
  );

  assert.equal(validator.validatePR(null).valid, false, "null PR should be invalid");
  assert.ok(
    validator.validatePR({ title: "PR", files: [{ path: "a.js", patch: "@@", reason: "why" }] }).valid,
    "a complete PR should be valid"
  );
  assert.equal(
    validator.validatePR({ title: "PR", files: [{ path: "a.js" }] }).valid,
    false,
    "a PR file without patch should be invalid"
  );

  assert.equal(validator.validateContext(null).valid, false, "null context should be invalid");
  assert.ok(validator.validateContext({ totalFiles: 1, topFiles: [] }).valid, "a complete context should be valid");
};
