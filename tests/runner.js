const fs = require("fs");
const path = require("path");

const SUITES_DIR = __dirname;
const RESULTS = { pass: 0, fail: 0, total: 0 };

function assert(condition, message) {
  RESULTS.total++;
  if (condition) {
    RESULTS.pass++;
    return true;
  }
  RESULTS.fail++;
  console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  return false;
}

assert.ok = function (condition, message) {
  RESULTS.total++;
  if (condition) { RESULTS.pass++; return true; }
  RESULTS.fail++;
  console.error(`  \x1b[31m✗\x1b[0m ${message}`);
  return false;
};

assert.equal = function (actual, expected, message) {
  const cond = actual === expected;
  if (cond) {
    RESULTS.total++;
    RESULTS.pass++;
  } else {
    RESULTS.total++;
    RESULTS.fail++;
    console.error(`  ✗ ${message}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
  }
  return cond;
};

assert.throws = function (fn, message) {
  RESULTS.total++;
  try { fn(); RESULTS.fail++; console.error(`  ✗ ${message} — no error thrown`); return false; }
  catch { RESULTS.pass++; return true; }
};

function colorize(text, color) {
  const codes = { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m", reset: "\x1b[0m" };
  return `${codes[color] || ""}${text}${codes.reset}`;
}

function runFile(filePath) {
  const name = path.basename(filePath, ".js");
  console.log(`\n ${colorize("►", "cyan")} ${colorize(name, "bold")}`);
  const start = Date.now();
  try {
    require(filePath)(assert);
    const ms = Date.now() - start;
    console.log(`   ${colorize("✓", "green")} ${ms}ms`);
  } catch (e) {
    console.error(`   ${colorize("✗", "red")} ${e.message}`);
    console.error(`     ${e.stack?.split("\n").slice(1, 3).join("\n     ") || ""}`);
  }
}

function runAll() {
  console.log(colorize("\n  DevOS Test Runner\n", "bold"));
  const files = fs.readdirSync(SUITES_DIR)
    .filter(f => f.endsWith(".test.js"))
    .sort()
    .map(f => path.join(SUITES_DIR, f));

  console.log(`  Found ${files.length} test suite(s)\n` + "─".repeat(40));

  for (const f of files) runFile(f);

  const pct = RESULTS.total > 0 ? Math.round(RESULTS.pass / RESULTS.total * 100) : 0;
  console.log(`\n${"─".repeat(40)}`);
  console.log(`  ${colorize("Results:", "bold")}  ${colorize(RESULTS.pass + " passed", "green")}, ${colorize(RESULTS.fail + " failed", "red")}, ${RESULTS.total} total`);
  console.log(`  ${colorize("Rate:", "bold")}     ${pct}%`);
  console.log("");
  process.exit(RESULTS.fail > 0 ? 1 : 0);
}

runAll();
