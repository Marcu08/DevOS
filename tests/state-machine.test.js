module.exports = function test(assert) {
  const state = require("../agent/state");

  // Reset by init
  state.init("test-task");

  assert.equal(state.getTask(), "test-task", "should store task");
  assert.equal(state.getMachine(), "Idle", "should start in Idle");

  // Transition
  state.transition("Planning");
  assert.equal(state.getMachine(), "Planning", "should transition to Planning");

  state.transition("Executing");
  assert.equal(state.getMachine(), "Executing", "should transition to Executing");

  state.transition("Validating");
  assert.equal(state.getMachine(), "Validating", "should transition to Validating");

  state.endExecution("completed");
  assert.equal(state.getMachine(), "Completed", "should end in Completed");

  // Invalid transition
  assert.throws(() => state.transition("Planning"), "should throw on invalid transition");

  // Step management
  state.init("steps-test");
  const step1 = state.addStep({ action: "validate", label: "Validate PR", type: "pr" });
  assert.equal(step1.id, 1, "first step should have id 1");
  assert.equal(step1.action, "validate", "should copy action");
  assert.equal(step1.type, "pr", "should copy type");
  assert.equal(step1.status, "pending", "should start pending");

  const step2 = state.addStep({ action: "applyPatch" });
  assert.equal(step2.id, 2, "second step should have id 2");

  // Step update
  state.updateStep(1, { status: "completed" });
  const s = state.get();
  const found = s.execution.steps.find(st => st.id === 1);
  assert.equal(found.status, "completed", "should update step status");

  // Clone
  const clone = s.clone();
  assert.equal(clone.task, "steps-test", "clone should have task");
};
