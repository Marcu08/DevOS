module.exports = function test(assert) {
  const approval = require("../agent/approval/index");

  // Module structure
  assert.ok(typeof approval.current === "function", "approval should have current");
  assert.ok(typeof approval.setMode === "function", "approval should have setMode");
  assert.ok(typeof approval.getModeConfig === "function", "approval should have getModeConfig");
  assert.ok(typeof approval.needsApproval === "function", "approval should have needsApproval");
  assert.ok(typeof approval.isDangerous === "function", "approval should have isDangerous");
  assert.ok(typeof approval.promptApproval === "function", "approval should have promptApproval");
  assert.ok(Array.isArray(approval.modes), "modes should be array");

  // Default mode
  const mode = approval.current();
  assert.ok(typeof mode === "string", "mode should be a string");
  assert.ok(["autonomous", "assisted", "safe"].includes(mode), "mode should be valid");

  // Mode config
  const cfg = approval.getModeConfig();
  assert.ok(typeof cfg.label === "string", "config should have label");
  assert.ok(Array.isArray(cfg.requiresApproval), "config should have requiresApproval");
  assert.ok(typeof cfg.parallel === "boolean", "config should have parallel flag");

  // Set mode
  const setResult = approval.setMode("safe");
  assert.ok(setResult.error === false, "setting safe mode should succeed");
  assert.equal(approval.current(), "safe", "current mode should update");

  // Safe mode needs approval
  const safeNeeds = approval.needsApproval("execute", []);
  assert.ok(safeNeeds.required === true, "safe mode should require approval");

  // Restore autonomous
  approval.setMode("autonomous");
  assert.equal(approval.current(), "autonomous", "mode should restore to autonomous");

  // Autonomous mode
  const autoNeeds = approval.needsApproval("execute", []);
  assert.ok(autoNeeds.required === false, "autonomous mode should not require approval");

  // Set assisted mode
  approval.setMode("assisted");
  assert.equal(approval.current(), "assisted", "assisted mode should work");

  const assistedNeeds = approval.needsApproval("execute", []);
  assert.ok(assistedNeeds.required === true, "assisted should require approval for execute");

  // Restore autonomous
  approval.setMode("autonomous");

  // Dangerous files detection
  assert.ok(approval.isDangerous(["package.json"]), "package.json should be dangerous");
  assert.ok(approval.isDangerous([".env"]), ".env should be dangerous");
  assert.ok(approval.isDangerous(["database/schema.sql"]), "database files should be dangerous");
  assert.ok(approval.isDangerous(["config/cert.pem"]), "cert files should be dangerous");
  assert.ok(approval.isDangerous(["Dockerfile"]), "Dockerfile should be dangerous");
  assert.ok(!approval.isDangerous(["src/index.js"]), "source files should not be dangerous");
  assert.ok(!approval.isDangerous([]), "empty list should not be dangerous");

  // Invalid mode
  const invalid = approval.setMode("nonexistent");
  assert.ok(invalid.error === true, "invalid mode should error");

  // Modes list
  assert.ok(approval.modes.length >= 3, "should have at least 3 modes");
  assert.ok(approval.modes.some(m => m.name === "autonomous"), "should include autonomous");
  assert.ok(approval.modes.some(m => m.name === "assisted"), "should include assisted");
  assert.ok(approval.modes.some(m => m.name === "safe"), "should include safe");

  // MODES constant
  assert.ok(approval.MODES.autonomous !== undefined, "MODES should have autonomous");
  assert.ok(approval.MODES.assisted !== undefined, "MODES should have assisted");
  assert.ok(approval.MODES.safe !== undefined, "MODES should have safe");
};
