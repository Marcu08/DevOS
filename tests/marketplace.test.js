module.exports = function test(assert) {
  const plugins = require("../plugins/index");

  // Search marketplace
  const results = plugins.searchMarketplace("javascript");
  assert.ok(Array.isArray(results), "search should return array");
  assert.ok(results.length > 0, "should find javascript plugin");
  assert.ok(results.some(r => r.name === "javascript"), "should match exact name");

  const noResults = plugins.searchMarketplace("nonexistent_xyz");
  assert.equal(noResults.length, 0, "should return empty for no match");

  // Get manifest
  const manifest = plugins.getManifest("javascript");
  assert.ok(manifest !== null, "should get manifest for existing plugin");
  assert.equal(manifest.name, "javascript", "manifest should have name");
  assert.ok(manifest.version, "manifest should have version");
  assert.ok(Array.isArray(manifest.capabilities), "manifest should have capabilities");
  assert.ok(Array.isArray(manifest.validators), "manifest should have validators");
  assert.ok(Array.isArray(manifest.detect), "manifest should have detect rules");

  const noManifest = plugins.getManifest("nonexistent");
  assert.equal(noManifest, null, "should return null for unknown plugin");

  // Install / Uninstall
  const installResult = plugins.install("javascript");
  assert.ok(installResult.error === false, "installing existing plugin should not error");
  assert.ok(typeof installResult.message === "string", "install should return message");

  const reinstallResult = plugins.install("javascript");
  assert.ok(reinstallResult.message.includes("already installed"), "reinstalling should say already installed");

  const unknownInstall = plugins.install("nonexistent_xyz");
  assert.ok(unknownInstall.error === true, "installing unknown plugin should error");

  // Get installed list
  const installed = plugins.getInstalled();
  assert.ok(Array.isArray(installed), "getInstalled should return array");

  // Uninstall
  const uninstallResult = plugins.uninstall("javascript");
  assert.ok(uninstallResult.error === false, "uninstalling should work");

  const doubleUninstall = plugins.uninstall("javascript");
  assert.ok(doubleUninstall.error === true, "double uninstall should error");

  // available() still works
  const available = plugins.available();
  assert.ok(available.length >= 4, "should have at least 4 plugins available");
};
