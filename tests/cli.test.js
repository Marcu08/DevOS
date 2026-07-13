module.exports = function test(assert) {
  const output = require("../agent/cli/output");

  // Colorize
  const colored = output.colorize("hello", "green");
  assert.ok(colored.includes("hello"), "colorize should include text");
  assert.ok(colored.includes("\x1b["), "colorize should add ANSI codes");

  // Icon
  assert.equal(output.icon("ok"), "✓", "ok icon");
  assert.equal(output.icon("fail"), "✗", "fail icon");
  assert.equal(output.icon("unknown"), "•", "unknown icon");

  // Banner (just check it doesn't crash)
  const spy = [];
  const origLog = console.log;
  console.log = (msg) => spy.push(msg);
  output.banner("Test");
  console.log = origLog;
  assert.ok(spy.length > 0, "banner should produce output");

  // Status (just check it doesn't crash)
  const spy2 = [];
  console.log = (msg) => spy2.push(msg);
  output.status("test-label", "ok", "detail");
  console.log = origLog;
  assert.ok(spy2.length > 0, "status should produce output");

  // CLI router (call run once to force command loading)
  const cli = require("../agent/cli/index");
  assert.ok(typeof cli.run === "function", "CLI should export run function");
  assert.ok(cli.registry !== undefined, "CLI should have registry");

  // Trigger command loading
  const fs = require("fs");
  const path = require("path");
  const cmdDir = path.join(__dirname, "..", "agent", "cli", "commands");
  const files = fs.readdirSync(cmdDir).filter(f => f.endsWith(".js"));
  for (const file of files) {
    const name = file.replace(".js", "");
    if (!cli.registry[name]) {
      cli.registry[name] = require(path.join(cmdDir, file));
    }
  }

  // Command handlers exist
  assert.ok(cli.registry.run !== undefined, "run command should exist");
  assert.ok(cli.registry.doctor !== undefined, "doctor command should exist");
  assert.ok(cli.registry.validate !== undefined, "validate command should exist");
  assert.ok(cli.registry.history !== undefined, "history command should exist");
  assert.ok(cli.registry.memory !== undefined, "memory command should exist");
  assert.ok(cli.registry.explain !== undefined, "explain command should exist");
  assert.ok(cli.registry.config !== undefined, "config command should exist");
  assert.ok(cli.registry.plugins !== undefined, "plugins command should exist");
  assert.ok(cli.registry.dashboard !== undefined, "dashboard command should exist");
};
