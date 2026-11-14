#!/usr/bin/env node
/**
 * DevOS startup benchmark.
 *
 * Usage:
 *   npm run bench
 *   node scripts/bench.js --check   # fail when a threshold is exceeded
 *   node scripts/bench.js --json
 */

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(ROOT, "cli.js");
const RUNS = 3;

const commandChecks = [
  { name: "help", args: ["help"] },
  { name: "config", args: ["config"] },
  { name: "mode", args: ["mode"] },
];

// Generous thresholds: CI runners are slower and noisier than a local machine.
const THRESHOLDS = {
  help: 1200,
  config: 1200,
  mode: 1200,
  contextCold: 2500,
  contextWarm: 800,
};

const json = process.argv.includes("--json");
const check = process.argv.includes("--check");

function runCli(args) {
  const times = [];

  for (let index = 0; index < RUNS; index++) {
    const started = process.hrtime.bigint();
    const result = spawnSync(process.execPath, [CLI, ...args], {
      cwd: ROOT,
      stdio: "ignore",
    });
    const ms = Number(process.hrtime.bigint() - started) / 1e6;

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`cli ${args.join(" ")} exited with ${result.status}`);
    times.push(ms);
  }

  return {
    avg: times.reduce((sum, value) => sum + value, 0) / times.length,
    min: Math.min(...times),
  };
}

function measure(fn) {
  const started = process.hrtime.bigint();
  fn();
  return Number(process.hrtime.bigint() - started) / 1e6;
}

function main() {
  const context = require("../agent/context/index");

  // Cold: bypass the cache entirely. Warm: prime once, then measure a hit.
  const contextCold = measure(() => context.buildContext({ cache: false }));
  context.buildContext();
  const contextWarm = measure(() => context.buildContext());

  const results = {};

  for (const entry of commandChecks) {
    results[entry.name] = runCli(entry.args);
  }

  results.contextCold = { avg: contextCold, min: contextCold };
  results.contextWarm = { avg: contextWarm, min: contextWarm };

  if (json) {
    console.log(JSON.stringify({ results, thresholds: THRESHOLDS }, null, 2));
  } else {
    console.log("\n  DevOS startup benchmark\n");
    for (const [name, value] of Object.entries(results)) {
      console.log(`  ${name.padEnd(14)} ${Math.round(value.avg).toString().padStart(5)} ms  (min ${Math.round(value.min)} ms)`);
    }
    console.log("");
  }

  if (check) {
    const failures = Object.entries(results).filter(([name, value]) => value.avg > THRESHOLDS[name]);
    if (failures.length > 0) {
      for (const [name, value] of failures) {
        console.error(`Threshold exceeded: ${name} ${Math.round(value.avg)}ms > ${THRESHOLDS[name]}ms`);
      }
      process.exit(1);
    }
    if (!json) console.log("  All benchmark thresholds passed\n");
  }
}

main();
