const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");
const reportBuilder = require("./report");
const log = require("../logger").get();

const VALIDATORS_DIR = __dirname;

function loadValidator(name) {
  try {
    return require(path.join(VALIDATORS_DIR, name));
  } catch {
    return null;
  }
}

function _getPluginReg() {
  try {
    const pm = require("../../plugins/manager");
    return pm.getInstance().getValidatorsRegistry();
  } catch {
    return null;
  }
}

function validate(context) {
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

    const mod = loadValidator(name);
    if (!mod) {
      results.push({ name, status: "skipped", time: 0, error: "Validator not found" });
      continue;
    }

    const result = mod.run(context);
    results.push(result);

    const status = result.status === "passed" ? "✓" : result.status === "skipped" ? "—" : "✗";
    log.info(`${status} ${name} (${result.time}ms)`, "VALIDATOR");
    if (result.error) {
      log.warn(`${result.error.slice(0, 120)}`, "VALIDATOR");
    }
  }

  // Run plugin validators from the registry
  const pluginReg = _getPluginReg();
  if (pluginReg) {
    for (const [name, validator] of Object.entries(pluginReg.getPlugins())) {
      try {
        const result = validator.run(context);
        results.push({ ...result, name });
        const status = result.status === "passed" ? "✓" : result.status === "skipped" ? "—" : "✗";
        log.info(`${status} ${name} (plugin) (${result.time}ms)`, "VALIDATOR");
      } catch (e) {
        log.warn(`Plugin validator '${name}' failed: ${e.message}`, "VALIDATOR");
        results.push({ name, status: "failed", time: 0, error: e.message });
      }
    }
  }

  const report = reportBuilder.build(results);
  log.info(`${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`, "VALIDATOR");

  return report;
}

module.exports = { validate };
