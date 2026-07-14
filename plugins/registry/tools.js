const eslint = require("../../agent/tools/eslint");
const npm = require("../../agent/tools/npm");
const tests = require("../../agent/tools/tests");
const doctor = require("../../agent/tools/doctor");

class ToolsRegistry {
  constructor() {
    this._builtins = {
      eslint: { module: eslint, defaultArgs: ["."] },
      lint: { module: eslint, defaultArgs: ["."] },
      npm: { module: npm, defaultArgs: [] },
      install: { module: npm, method: "install" },
      test: { module: tests, defaultArgs: [] },
      tests: { module: tests, defaultArgs: [] },
      doctor: { module: doctor },
    };
    this._plugins = {};
  }

  register(name, toolDef, pluginName) {
    this._plugins[name] = { ...toolDef, plugin: pluginName };
  }

  unregister(name) {
    delete this._plugins[name];
  }

  get(name) {
    return this._builtins[name] || this._plugins[name] || null;
  }

  has(name) {
    return name in this._builtins || name in this._plugins;
  }

  run(name, args = []) {
    const tool = this.get(name);
    if (!tool) return { ok: false, error: `Unknown tool: ${name}. Available: ${this.available().join(", ")}` };

    if (tool.module) {
      if (tool.method) {
        return tool.module[tool.method](args);
      }
      return tool.module.run(args.length > 0 ? args : tool.defaultArgs || []);
    }

    if (tool.run) {
      return tool.run(args, {});
    }

    return { ok: false, error: `Tool '${name}' has no run method` };
  }

  available() {
    return [...Object.keys(this._builtins), ...Object.keys(this._plugins)];
  }

  getBuiltins() {
    return { ...this._builtins };
  }

  getPluginTools() {
    return { ...this._plugins };
  }
}

module.exports = ToolsRegistry;