# Tests

DevOS uses a small built-in runner. Every `*.test.js` file in this directory is
discovered automatically and runs in its own suite.

## Run

```bash
npm test
# or
node tests/runner.js
```

Useful options:

```bash
node tests/runner.js --list              # list discovered suites
node tests/runner.js --filter=config     # run matching suites only
node tests/runner.js --bail              # stop at the first failing suite
node tests/runner.js --isolate           # fresh require cache per suite
node tests/runner.js --verbose           # show suite logs
node tests/runner.js --json              # machine-readable report
node tests/runner.js --timeout=60000     # per-suite timeout (0 disables)
```

The runner exits with code `1` when any assertion fails, a suite throws, or a filter
matches no suites. Suite console output is captured and shown only for failing
suites (or with `--verbose`).

## Write a suite

A suite exports a function that receives an `assert` object:

```js
module.exports = function test(assert) {
  assert.ok(true, "truthy value");
  assert.equal(1 + 1, 2, "math works");
  assert.deepEqual({ a: 1 }, { a: 1 }, "objects match");
  assert.throws(() => { throw new Error("boom"); }, "throws");
};
```

Supported assertions:

| Method | Purpose |
|--------|---------|
| `assert(condition, message)` / `assert.ok(...)` | Truthy check |
| `assert.equal(actual, expected, message)` | Strict equality |
| `assert.notEqual(actual, expected, message)` | Strict inequality |
| `assert.deepEqual(actual, expected, message)` | Deep strict equality |
| `assert.throws(fn, message)` | Function must throw |
| `assert.doesNotThrow(fn, message)` | Function must not throw |
| `assert.includes(haystack, needle, message)` | String/array inclusion |
| `assert.match(value, regexp, message)` | Regex match |
| `assert.fail(message)` | Explicit failure |

Async suites are supported by returning a promise:

```js
module.exports = async function test(assert) {
  const value = await Promise.resolve(42);
  assert.equal(value, 42, "async value");
};
```

## Test hygiene

- Do not leave generated files behind. If a test writes a tracked file, restore it in
  a `finally` block (see `marketplace-v2.test.js`).
- Runtime state belongs in `logs/` (for example `logs/mode.json`), which is
  gitignored.
- Prefer `--isolate` when a suite depends on module-level singletons.
- Keep assertions meaningful: a suite that only checks `typeof` does not protect
  behavior.
