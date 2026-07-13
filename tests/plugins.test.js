module.exports = function test(assert) {
  const plugins = require("../plugins/index");

  const available = plugins.available();
  assert.ok(available.length >= 4, "should detect at least 4 plugins");
  assert.ok(available.some(p => p.name === "javascript"), "should include javascript plugin");
  assert.ok(available.some(p => p.name === "react"), "should include react plugin");

  const jsPlugin = require("../plugins/javascript");
  assert.equal(jsPlugin.name, "javascript", "plugin should have name");
  assert.equal(jsPlugin.version, "1.0.0", "plugin should have version");
  assert.ok(Array.isArray(jsPlugin.detect), "plugin should have detect rules");
  assert.ok(Array.isArray(jsPlugin.tools), "plugin should have tools");
  assert.ok(Array.isArray(jsPlugin.rules), "plugin should have rules");

  const reactPlugin = require("../plugins/react");
  assert.ok(reactPlugin.detect.includes("react"), "react plugin should detect react");
  assert.ok(reactPlugin.tools.includes("jest"), "react plugin should include jest");

  // Detection
  const ctx = {
    topFiles: [{ file: "src/index.js" }, { file: "package.json" }],
    dependencyMap: { "src/index.js": ["react", "react-dom"] },
  };
  const detected = plugins.detectPlugins(ctx);
  assert.ok(detected.length >= 2, "should detect javascript and react");
  assert.ok(detected.some(d => d.plugin.name === "javascript"), "should match javascript");
  assert.ok(detected.some(d => d.plugin.name === "react"), "should match react");

  const tools = plugins.getEnabledTools(ctx);
  assert.ok(tools.includes("eslint"), "should enable eslint for JS project");
  assert.ok(tools.includes("npm"), "should enable npm for JS project");
  assert.ok(tools.includes("jest"), "should enable jest for React project");

  const rules = plugins.getProjectRules(ctx);
  assert.ok(rules.length >= 3, "should return combined rules");
};
