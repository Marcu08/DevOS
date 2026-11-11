const eslint = require("./eslint");
const npm = require("./npm");
const tests = require("./tests");
const doctor = require("./doctor");

const REGISTRY = {
  eslint: { module: eslint, defaultArgs: ["."] },
  lint: { module: eslint, defaultArgs: ["."] },
  npm: { module: npm, defaultArgs: [] },
  install: { module: npm, method: "install" },
  test: { module: tests, defaultArgs: [] },
  tests: { module: tests, defaultArgs: [] },
  doctor: { module: doctor },
};

function _getPluginReg() {
  try {
    const pm = require("../../plugins/manager");
    return pm.getInstance().getToolsRegistry();
  } catch {
    return null;
  }
}

function run(name, args = []) {
  const tool = REGISTRY[name];
  if (tool) {
    if (tool.method) {
      return tool.module[tool.method](args);
    }
    return tool.module.run(args.length > 0 ? args : tool.defaultArgs || []);
  }

  const pluginReg = _getPluginReg();
  if (pluginReg && pluginReg.has(name)) {
    return pluginReg.run(name, args);
  }

  const all = available();
  return { ok: false, error: `Unknown tool: ${name}. Available: ${all.join(", ")}` };
}

function available() {
  const names = Object.keys(REGISTRY);
  const pluginReg = _getPluginReg();
  if (pluginReg) {
    const pluginNames = Object.keys(pluginReg.getPluginTools());
    names.push(...pluginNames);
  }
  return [...new Set(names)];
}

module.exports = { run, available };
