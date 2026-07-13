module.exports = function test(assert) {
  const DEVOS = require("../agent/config");

  assert.ok(DEVOS.root !== undefined, "config should have root");
  assert.ok(DEVOS.workspace !== undefined, "config should have workspace");
  assert.ok(DEVOS.logs !== undefined, "config should have logs directory");
  assert.ok(DEVOS.config !== undefined, "config should have full config object");

  const cfg = DEVOS.config;
  assert.ok(cfg.version !== undefined, "config should have version");
  assert.ok(cfg.name !== undefined, "config should have name");
  assert.ok(cfg.validator !== undefined, "config should have validator settings");
  assert.ok(cfg.tools !== undefined, "config should have tools settings");
  assert.ok(cfg.memory !== undefined, "config should have memory settings");
  assert.ok(cfg.reasoning !== undefined, "config should have reasoning settings");
  assert.ok(cfg.reasoning.confidenceThreshold !== undefined, "config should have confidenceThreshold");
  assert.equal(cfg.reasoning.confidenceThreshold, 0.6, "confidenceThreshold should be 0.6");
};
