module.exports = function test(assert) {
  const fs = require("fs");
  const path = require("path");
  const plugins = require("../plugins/index");

  const pluginsDir = path.join(__dirname, "..", "plugins");
  const marketplaceFile = path.join(pluginsDir, "marketplace.json");
  const installedFile = path.join(pluginsDir, ".installed.json");
  const generatedPlugin = path.join(pluginsDir, "test-plugin.js");
  const originalMarketplace = fs.readFileSync(marketplaceFile, "utf-8");
  const originalInstalled = fs.existsSync(installedFile) ? fs.readFileSync(installedFile, "utf-8") : null;

  try {
    // New marketplace functions
    assert.ok(typeof plugins.remove === "function", "plugins should have remove");
    assert.ok(typeof plugins.update === "function", "plugins should have update");
    assert.ok(typeof plugins.publish === "function", "plugins should have publish");
    assert.ok(typeof plugins.checkCompatibility === "function", "plugins should have checkCompatibility");

    // Publish
    const pubResult = plugins.publish("test-plugin", { version: "1.0.0", description: "Test plugin", capabilities: ["test"] });
    assert.ok(pubResult.error === false, "publishing should succeed");
    assert.ok(pubResult.message.includes("published"), "publish should confirm");

    // Search should now find test-plugin
    const search = plugins.searchMarketplace("test-plugin");
    assert.ok(search.some(s => s.name === "test-plugin"), "search should find published plugin");

    // Install
    const installResult = plugins.install("test-plugin");
    assert.ok(installResult.error === false, "installing should succeed");

    // Check compatibility
    const compat = plugins.checkCompatibility("test-plugin");
    assert.ok(typeof compat.compatible === "boolean", "compatibility should return boolean");
    assert.ok(compat.reason !== undefined, "compatibility should have reason");

    // Update
    plugins.publish("test-plugin", { version: "2.0.0", description: "Updated test plugin", capabilities: ["test", "lint"] });
    const updateResult = plugins.update("test-plugin");
    assert.ok(updateResult.error === false, "update should succeed");
    assert.ok(updateResult.message.includes("2.0.0"), "update message should mention new version");

    // Remove
    const removeResult = plugins.remove("test-plugin");
    assert.ok(removeResult.error === false, "remove should succeed");

    // Double remove should error
    const doubleRemove = plugins.remove("test-plugin");
    assert.ok(doubleRemove.error === true, "double remove should error");

    // Check that update on non-installed plugin returns error
    const updateNonInstalled = plugins.update("nonexistent-plugin");
    assert.ok(updateNonInstalled.error === true, "updating non-installed plugin should error");

    // Check compatibility for unknown plugin
    const compatUnknown = plugins.checkCompatibility("nonexistent-plugin");
    assert.ok(compatUnknown.compatible === false, "unknown plugin should not be compatible");
  } finally {
    // Restore the tracked marketplace files and remove any generated plugin file
    // so running the suite never leaves test data behind.
    fs.writeFileSync(marketplaceFile, originalMarketplace);
    if (originalInstalled === null) {
      try { fs.unlinkSync(installedFile); } catch {}
    } else {
      fs.writeFileSync(installedFile, originalInstalled);
    }
    try { fs.unlinkSync(generatedPlugin); } catch {}
  }
};
