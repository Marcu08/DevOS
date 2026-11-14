module.exports = function test(assert) {
  const opencode = require("../agent/ai/opencode");

  assert.ok(typeof opencode.isAvailable === "function", "opencode should expose isAvailable");
  assert.ok(typeof opencode.run === "function", "opencode should expose run");

  const previous = process.env.DEVOS_OPENCODE_BIN;
  process.env.DEVOS_OPENCODE_BIN = "devos-opencode-definitely-not-installed";

  try {
    assert.equal(opencode.isAvailable(), false, "a missing binary should be unavailable");
    assert.equal(opencode.run("prompt", "task"), null, "run should return null when the binary is missing");
  } finally {
    if (previous === undefined) delete process.env.DEVOS_OPENCODE_BIN;
    else process.env.DEVOS_OPENCODE_BIN = previous;
  }
};
