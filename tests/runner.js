#!/usr/bin/env node
/**
 * DevOS test runner.
 *
 * Usage:
 *   node tests/runner.js [options]
 *
 * Options:
 *   --filter=<text>   Run only suites whose filename contains <text>
 *   --timeout=<ms>    Per-suite timeout in ms (default 30000, 0 disables)
 *   --bail            Stop after the first failing suite
 *   --list            List discovered suites and exit
 *   --json            Print a machine-readable report
 *   --verbose         Show logs emitted by every suite
 *   --quiet           Never show suite logs (they are shown on failure by default)
 *   --isolate         Clear the project require cache before each suite
 *   --help            Show this help
 */

const fs = require("fs");
const path = require("path");
const util = require("util");

const ROOT = path.resolve(__dirname, "..");
const SUITES_DIR = __dirname;
const DEFAULT_TIMEOUT = 30000;

const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
  printHelp();
  process.exit(0);
}

const files = fs.readdirSync(SUITES_DIR)
  .filter((file) => file.endsWith(".test.js"))
  .sort()
  .map((file) => path.join(SUITES_DIR, file))
  .filter((file) => !opts.filter || path.basename(file).toLowerCase().includes(opts.filter));

if (opts.list) {
  for (const file of files) console.log(path.basename(file, ".test.js"));
  process.exit(0);
}

if (files.length === 0) {
  console.error(opts.filter ? `No suites match filter "${opts.filter}"` : "No test suites found");
  process.exit(1);
}

const summary = {
  suites: 0,
  suitesPassed: 0,
  suitesFailed: 0,
  assertions: 0,
  passed: 0,
  failed: 0,
  duration: 0,
};

const reports = [];

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection during tests:", reason);
  process.exitCode = 1;
});

async function main() {
  const started = Date.now();
  if (!opts.json) {
    console.log(`\n  ${bold("DevOS Test Runner")}`);
    console.log(`  Node ${process.version} on ${process.platform} — ${files.length} suite(s)\n`);
  }

  for (const file of files) {
    const report = await runSuite(file);
    reports.push(report);
    summary.suites++;

    if (report.error || report.failed > 0) {
      summary.suitesFailed++;
      if (opts.bail) break;
    } else {
      summary.suitesPassed++;
    }
  }

  summary.duration = Date.now() - started;
  summary.assertions = reports.reduce((sum, report) => sum + report.assertions, 0);
  summary.passed = reports.reduce((sum, report) => sum + report.passed, 0);
  summary.failed = reports.reduce((sum, report) => sum + report.failed, 0);

  const ok = summary.suitesFailed === 0 && summary.failed === 0;

  if (opts.json) {
    console.log(JSON.stringify({ ok, summary, suites: reports }, null, 2));
  } else {
    printSummary(ok);
  }

  process.exitCode = ok ? 0 : 1;
}

async function runSuite(file) {
  const name = path.basename(file, ".test.js");
  const report = {
    name,
    file: path.relative(ROOT, file).replace(/\\/g, "/"),
    assertions: 0,
    passed: 0,
    failed: 0,
    duration: 0,
    failures: [],
    error: null,
    logs: [],
  };

  if (!opts.json) process.stdout.write(`  ${cyan("►")} ${bold(name)}`);

  if (opts.isolate) clearProjectCache();

  const capture = captureConsole();
  const started = Date.now();
  const assert = createAssert(report);

  try {
    const suite = require(file);
    if (typeof suite !== "function") {
      throw new Error("Suite must export a function: module.exports = function test(assert) { ... }");
    }
    const result = suite(assert);
    if (result && typeof result.then === "function") {
      await withTimeout(result, opts.timeout, name);
    }
  } catch (error) {
    report.error = error && error.stack ? error.stack : String(error);
  } finally {
    report.duration = Date.now() - started;
    capture.restore();
    report.logs = capture.logs;
  }

  const suiteFailed = report.error || report.failed > 0;
  if (!opts.json) {
    if (suiteFailed) {
      console.log(`  ${red("✗")} ${report.failed} failed, ${report.passed} passed (${report.duration}ms)`);
      for (const failure of report.failures) {
        console.log(`      ${red("✗")} ${failure.message}`);
        if (failure.details) console.log(`        ${dim(failure.details)}`);
      }
      if (report.error) console.log(`      ${red("✗")} ${report.error}`);
      if (!opts.quiet && report.logs.length > 0) {
        console.log(`      ${dim("suite output:")}`);
        for (const line of report.logs) console.log(`        ${dim(line)}`);
      }
    } else {
      console.log(`  ${green("✓")} ${report.assertions} assertion(s) in ${report.duration}ms`);
      if (opts.verbose && report.logs.length > 0) {
        for (const line of report.logs) console.log(`      ${dim(line)}`);
      }
    }
  }

  return report;
}

function createAssert(report) {
  function record(ok, message, details) {
    report.assertions++;
    if (ok) {
      report.passed++;
      return true;
    }
    report.failed++;
    report.failures.push({ message: message || "assertion failed", details });
    return false;
  }

  function assert(condition, message) {
    return record(!!condition, message || "assertion failed");
  }

  assert.ok = (condition, message) => record(!!condition, message || "expected a truthy value");

  assert.equal = (actual, expected, message) => {
    const ok = actual === expected;
    return record(
      ok,
      message || "values should be equal",
      ok ? undefined : `expected: ${format(expected)}  actual: ${format(actual)}`
    );
  };

  assert.notEqual = (actual, expected, message) => {
    const ok = actual !== expected;
    return record(
      ok,
      message || "values should not be equal",
      ok ? undefined : `both values: ${format(actual)}`
    );
  };

  assert.deepEqual = (actual, expected, message) => {
    const ok = util.isDeepStrictEqual(actual, expected);
    return record(
      ok,
      message || "values should be deeply equal",
      ok ? undefined : `expected: ${format(expected)}  actual: ${format(actual)}`
    );
  };

  assert.throws = (fn, message) => {
    try {
      fn();
      return record(false, message || "expected function to throw");
    } catch {
      return record(true, message || "expected function to throw");
    }
  };

  assert.doesNotThrow = (fn, message) => {
    try {
      fn();
      return record(true, message || "expected function not to throw");
    } catch (error) {
      return record(false, message || "expected function not to throw", error.message);
    }
  };

  assert.includes = (haystack, needle, message) => {
    const ok = typeof haystack === "string" ? haystack.includes(needle) : Array.isArray(haystack) && haystack.includes(needle);
    return record(ok, message || "value should include the expected item", ok ? undefined : `expected ${format(haystack)} to include ${format(needle)}`);
  };

  assert.match = (value, regexp, message) => {
    const ok = new RegExp(regexp).test(String(value));
    return record(ok, message || "value should match the pattern", ok ? undefined : `value: ${format(value)}  pattern: ${regexp}`);
  };

  assert.fail = (message) => record(false, message || "explicit failure");

  return assert;
}

function withTimeout(promise, ms, name) {
  if (!ms) return promise;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Suite "${name}" timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function captureConsole() {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  const logs = [];

  const capture = (level) => (...args) => {
    logs.push(`[${level}] ${util.format(...args)}`);
  };

  console.log = capture("log");
  console.info = capture("info");
  console.warn = capture("warn");
  console.error = capture("error");

  return {
    logs,
    restore() {
      console.log = original.log;
      console.info = original.info;
      console.warn = original.warn;
      console.error = original.error;
    },
  };
}

function clearProjectCache() {
  for (const key of Object.keys(require.cache)) {
    if (!key.startsWith(ROOT)) continue;
    if (key.includes(`${path.sep}node_modules${path.sep}`)) continue;
    if (key === __filename) continue;
    delete require.cache[key];
  }
}

function printSummary(ok) {
  console.log(`\n  ${dim("─".repeat(46))}`);
  console.log(`  Suites:     ${green(`${summary.suitesPassed} passed`)}${summary.suitesFailed ? `, ${red(`${summary.suitesFailed} failed`)}` : ""} (${summary.suites} total)`);
  console.log(`  Assertions: ${green(`${summary.passed} passed`)}${summary.failed ? `, ${red(`${summary.failed} failed`)}` : ""} (${summary.assertions} total)`);
  console.log(`  Duration:   ${(summary.duration / 1000).toFixed(2)}s`);
  if (ok) {
    console.log(`  ${green(bold("All tests passed"))}`);
  } else {
    console.log(`  ${red(bold("Tests failed"))}`);
    for (const report of reports) {
      if (report.error || report.failed > 0) {
        console.log(`    ${red("✗")} ${report.name}${report.error ? " (suite error)" : ` (${report.failed} failed)`}`);
      }
    }
  }
  console.log("");
}

function parseArgs(argv) {
  const parsed = {
    filter: null,
    timeout: DEFAULT_TIMEOUT,
    bail: false,
    list: false,
    json: false,
    verbose: false,
    quiet: false,
    isolate: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--bail") parsed.bail = true;
    else if (arg === "--list") parsed.list = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--verbose") parsed.verbose = true;
    else if (arg === "--quiet") parsed.quiet = true;
    else if (arg === "--isolate") parsed.isolate = true;
    else if (arg.startsWith("--filter=")) parsed.filter = arg.slice("--filter=".length);
    else if (arg === "--filter") parsed.filter = argv[++index];
    else if (arg.startsWith("--timeout=")) parsed.timeout = parseTimeout(arg.slice("--timeout=".length));
    else if (arg === "--timeout") parsed.timeout = parseTimeout(argv[++index]);
    else {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (parsed.filter) parsed.filter = parsed.filter.toLowerCase();
  return parsed;
}

function parseTimeout(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.error(`Invalid timeout: ${value}`);
    process.exit(1);
  }
  return Math.floor(parsed);
}

function printHelp() {
  console.log(`
  DevOS Test Runner

  Usage:
    node tests/runner.js [options]

  Options:
    --filter=<text>   Run only suites whose filename contains <text>
    --timeout=<ms>    Per-suite timeout in ms (default ${DEFAULT_TIMEOUT}, 0 disables)
    --bail            Stop after the first failing suite
    --list            List discovered suites and exit
    --json            Print a machine-readable report
    --verbose         Show logs emitted by every suite
    --quiet           Never show suite logs (shown on failure by default)
    --isolate         Clear the project require cache before each suite
    --help            Show this help

  Writing a suite:
    module.exports = function test(assert) {
      assert.ok(true, "should be true");
      assert.equal(1 + 1, 2, "math works");
    };
`);
}

function format(value) {
  if (typeof value === "string") return JSON.stringify(value);
  try {
    return util.inspect(value, { depth: 4, breakLength: 120 });
  } catch {
    return String(value);
  }
}

function color(code, text) {
  if (!process.stdout.isTTY || process.env.NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

const bold = (text) => color("1", text);
const dim = (text) => color("2", text);
const red = (text) => color("31", text);
const green = (text) => color("32", text);
const cyan = (text) => color("36", text);

main().catch((error) => {
  console.error("Test runner crashed:", error);
  process.exit(1);
});
