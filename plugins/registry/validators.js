const path = require("path");
const fs = require("fs");
const DEVOS = require("../../agent/config");
const reportBuilder = require("../../agent/validator/report");
const log = require("../../agent/logger").get();

const VALIDATORS_DIR = path.resolve(__dirname, "../../agent/validator");

class ValidatorsRegistry {
  constructor() {
    this._plugins = {};
  }

  register(name, validatorDef, pluginName) {
    this._plugins[name] = { ...validatorDef, plugin: pluginName };
  }

  unregister(name) {
    delete this._plugins[name];
  }

  get(name) {
    return this._plugins[name] || null;
  }

  has(name) {
    return name in this._plugins;
  }

  _loadBuiltin(name) {
    try {
      return require(path.join(VALIDATORS_DIR, name));
    } catch {
      return null;
    }
  }

  validate(context) {
    const cfg = DEVOS.config.validator || {};
    const enabled = {
      syntax: cfg.syntax !== false,
      git: cfg.git !== false,
      lint: cfg.lint !== false,
      node: cfg.node !== false,
    };

    const order = ["syntax", "git", "node", "lint"];
    const results = [];

    for (const name of order) {
      if (!enabled[name]) {
        results.push({ name, status: "disabled", time: 0, error: null });
        continue;
      }

      const mod = this._loadBuiltin(name);
      if (!mod) {
        results.push({ name, status: "skipped", time: 0, error: "Validator not found" });
        continue;
      }

      const result = mod.run(context);
      results.push(result);

      const status = result.status === "passed" ? "\u2713" : result.status === "skipped" ? "\u2014" : "\u2717";
      log.info(`${status} ${name} (${result.time}ms)`, "VALIDATOR");
      if (result.error) {
        log.warn(`${result.error.slice(0, 120)}`, "VALIDATOR");
      }
    }

    for (const [name, validator] of Object.entries(this._plugins)) {
      try {
        const result = validator.run(context);
        results.push({ ...result, name });
        const status = result.status === "passed" ? "\u2713" : result.status === "skipped" ? "\u2014" : "\u2717";
        log.info(`${status} ${name} (plugin) (${result.time}ms)`, "VALIDATOR");
      } catch (e) {
        log.warn(`Plugin validator '${name}' failed: ${e.message}`, "VALIDATOR");
        results.push({ name, status: "failed", time: 0, error: e.message });
      }
    }

    const report = reportBuilder.build(results);
    log.info(`${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`, "VALIDATOR");

    return report;
  }

  available() {
    return {
      builtins: ["syntax", "git", "node", "lint"],
      plugins: Object.keys(this._plugins),
    };
  }
}

module.exports = ValidatorsRegistry;