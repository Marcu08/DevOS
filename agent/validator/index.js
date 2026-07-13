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

  const report = reportBuilder.build(results);
  log.info(`${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`, "VALIDATOR");

  return report;
}

module.exports = { validate };
