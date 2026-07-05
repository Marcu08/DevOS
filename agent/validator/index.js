const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");
const reportBuilder = require("./report");

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
    console.log(`  [VALIDATOR] ${status} ${name} (${result.time}ms)`);
    if (result.error) {
      console.log(`             ${result.error.slice(0, 120)}`);
    }
  }

  const report = reportBuilder.build(results);
  console.log(`[VALIDATOR] ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.skipped} skipped`);

  return report;
}

module.exports = { validate };
