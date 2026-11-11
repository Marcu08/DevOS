module.exports = function test(assert) {
  const pm = require("../plugins/manager");

  // Reset to fresh state for clean test
  pm.resetInstance();
  const mgr = pm.getInstance();

  // ── Plugin Tools ──────────────────────────────────────────────

  const toolsReg = mgr.getToolsRegistry();

  // Built-in tools should exist before any plugin registrations
  assert.ok(toolsReg.has("eslint"), "built-in eslint tool should exist");
  assert.ok(toolsReg.has("npm"), "built-in npm tool should exist");
  assert.ok(toolsReg.has("doctor"), "built-in doctor tool should exist");

  // Register a plugin tool in v2 format
  toolsReg.register("test-plugin-tool", {
    description: "A test tool from a plugin",
    run: (args) => ({ ok: true, data: `ran with ${JSON.stringify(args)}` }),
  }, "test-plugin");

  assert.ok(toolsReg.has("test-plugin-tool"), "plugin tool should be registered");

  // Built-in tools should still exist
  assert.ok(toolsReg.has("eslint"), "built-in eslint should still exist after plugin registration");

  // Execute plugin tool
  const toolResult = toolsReg.run("test-plugin-tool", ["arg1", "arg2"]);
  assert.ok(toolResult.ok === true, "plugin tool should execute successfully");
  assert.ok(toolResult.data.includes("arg1"), "plugin tool should receive args");

  // Execute built-in tool still works
  const npmResult = toolsReg.run("npm", []);
  assert.ok(npmResult.ok === false, "npm without args should fail gracefully (no package.json)");

  // Unknown tool
  const unknownResult = toolsReg.run("nonexistent-tool", []);
  assert.ok(unknownResult.ok === false, "unknown tool should return error");

  // available() includes both built-ins and plugins
  const available = toolsReg.available();
  assert.ok(available.includes("eslint"), "available should include built-in eslint");
  assert.ok(available.includes("test-plugin-tool"), "available should include plugin tool");

  // getPluginTools() returns only plugin tools
  const pluginTools = toolsReg.getPluginTools();
  assert.ok("test-plugin-tool" in pluginTools, "getPluginTools should include plugin tool");
  assert.equal("eslint" in pluginTools, false, "getPluginTools should not include built-in eslint");

  // ── Agent tools/index.js delegation ───────────────────────────

  const toolIndex = require("../agent/tools/index");

  // Built-in tools still work through the delegate
  assert.ok(toolIndex.available().includes("eslint"), "tools.available() should include eslint");

  // Plugin tools appear in available()
  assert.ok(toolIndex.available().includes("test-plugin-tool"), "tools.available() should include plugin tool");

  // Plugin tool execution through delegate
  const delegateResult = toolIndex.run("test-plugin-tool", ["via-delegate"]);
  assert.ok(delegateResult.ok === true, "tools.run() should execute plugin tool via delegate");
  assert.ok(delegateResult.data.includes("via-delegate"), "delegate tool should receive args");

  // Built-in tool execution through delegate
  const builtinViaDelegate = toolIndex.run("eslint", ["."]);
  assert.ok(builtinViaDelegate.ok === true || builtinViaDelegate.ok === false,
    "built-in tool via delegate should return { ok }");

  // Unknown tool via delegate
  const unknownViaDelegate = toolIndex.run("absolutely-fake-tool-xyz", []);
  assert.ok(unknownViaDelegate.ok === false, "unknown tool via delegate should return error");

  // ── Plugin Validators ─────────────────────────────────────────

  const valReg = mgr.getValidatorsRegistry();

  const validatorDef = {
    description: "Test plugin validator that always passes",
    run: (ctx) => ({
      name: "test-validator",
      status: "passed",
      time: 3,
      error: null,
    }),
  };
  valReg.register("test-validator", validatorDef, "test-plugin");

  const valPlugins = valReg.getPlugins();
  assert.ok("test-validator" in valPlugins, "plugin validator should appear in getPlugins()");

  // Run the full validator engine — plugin validators should be included
  const validator = require("../agent/validator/index");
  const report = validator.validate({ modifiedFiles: [] });
  const pluginValResult = report.validators.find(v => v.name === "test-validator");
  assert.ok(pluginValResult !== undefined, "plugin validator should appear in validation report");
  assert.equal(pluginValResult.status, "passed", "plugin validator status should be passed");

  // Built-in validators still run
  assert.ok(report.validators.some(v => v.name === "syntax"), "syntax validator should still run");
  assert.ok(report.validators.some(v => v.name === "git"), "git validator should still run");
  assert.ok(report.validators.some(v => v.name === "node"), "node validator should still run");
  assert.ok(report.validators.some(v => v.name === "lint"), "lint validator should still run");

  // A failing plugin validator
  valReg.register("failing-validator", {
    description: "A validator that fails",
    run: () => ({ name: "failing-validator", status: "failed", time: 1, error: "intentional failure" }),
  }, "test-plugin");

  const report2 = validator.validate({ modifiedFiles: [] });
  const failingResult = report2.validators.find(v => v.name === "failing-validator");
  assert.equal(failingResult.status, "failed", "failing plugin validator should report failed");
  assert.equal(failingResult.error, "intentional failure", "failing validator error should be preserved");

  // A plugin validator that throws
  valReg.register("throwing-validator", {
    description: "A validator that throws",
    run: () => { throw new Error("crash!"); },
  }, "test-plugin");

  const report3 = validator.validate({ modifiedFiles: [] });
  const thrownResult = report3.validators.find(v => v.name === "throwing-validator");
  assert.equal(thrownResult.status, "failed", "throwing plugin validator should be caught as failed");
  assert.ok(thrownResult.error.includes("crash"), "throwing validator error should be captured");

  // ── Plugin Commands ───────────────────────────────────────────

  const cmdReg = mgr.getCommandsRegistry();
  let cmdExecuted = false;
  let cmdArgs = null;

  cmdReg.register("greet", {
    description: "Greet the user",
    handler: (args) => {
      cmdExecuted = true;
      cmdArgs = args;
      return `hello ${args.join(" ")}`;
    },
  }, "test-plugin");

  const allCmds = cmdReg.loadAll();
  // Plugin commands should be qualified with plugin:command
  const qualifiedName = "test-plugin:greet";
  assert.ok(qualifiedName in allCmds, "plugin command should appear with plugin: prefix in loadAll()");
  assert.ok(allCmds[qualifiedName].handler !== undefined, "qualified command should have handler");

  // Built-in commands still in loadAll
  assert.ok("run" in allCmds, "built-in 'run' should be in loadAll");
  assert.ok("plugins" in allCmds, "built-in 'plugins' should be in loadAll");
  assert.ok("doctor" in allCmds, "built-in 'doctor' should be in loadAll");

  // Execute plugin command
  const cmdResult = allCmds[qualifiedName].handler(["world"]);
  assert.ok(cmdExecuted === true, "plugin command handler should execute");
  assert.ok(cmdResult.includes("hello world"), "command handler should receive and use args");

  // available() returns builtins and plugins
  const cmdAvail = cmdReg.available();
  assert.ok(cmdAvail.builtins.includes("run"), "available builtins should include run");
  assert.ok(cmdAvail.builtins.includes("plugins"), "available builtins should include plugins");
  assert.ok(cmdAvail.plugins.includes("greet"), "available plugins should include greet");

  // ── Compatibility: Plugin with no v2 capabilities should load ─

  // V1 plugins are loaded from disk during _loadAll()
  const v1Plugins = mgr.getAll();
  assert.ok(v1Plugins.length >= 4, "v1 plugins should still be loaded after registry wiring");
  assert.ok(v1Plugins.some(p => p.name === "javascript"), "javascript v1 plugin should be loaded");
  assert.ok(v1Plugins.some(p => p.name === "python"), "python v1 plugin should be loaded");

  // ── Duplicate registration behavior ───────────────────────────

  toolsReg.register("duplicate-tool", {
    run: () => ({ ok: true, data: "first" }),
  }, "plugin-a");

  toolsReg.register("duplicate-tool", {
    run: () => ({ ok: true, data: "second" }),
  }, "plugin-b");

  // Last registration wins (default object spread behavior in register())
  const dupResult = toolsReg.run("duplicate-tool", []);
  assert.ok(dupResult.ok === true, "duplicate tool should still execute");
  // Second pluginB overwrites pluginA — this is deterministic (last-write-wins)

  // ── Clean up ──────────────────────────────────────────────────

  pm.resetInstance();
};
