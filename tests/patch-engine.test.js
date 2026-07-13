module.exports = function test(assert) {
  const { applyDiff, generateDiff, parse } = require("../agent/patch-engine");

  // Parser
  const parsed = parse("--- a/x\n+++ b/x\n@@ -1,3 +1,4 @@\n a\n-b\n+c\n d\n");
  assert.equal(parsed.length, 1, "should parse one hunk");
  assert.equal(parsed[0].oldStart, 1, "should parse oldStart");
  assert.equal(parsed[0].newStart, 1, "should parse newStart");

  // Apply: basic context replacement
  const content = "a\nb\nc\nd\ne";
  const diff = "--- a/test\n+++ b/test\n@@ -2,3 +2,3 @@\n b\n-c\n+X\n d";
  const result = applyDiff(content, diff);
  assert.equal(result, "a\nb\nX\nd\ne", "should replace line with context matching");

  // Apply: identity (empty diff)
  assert.equal(applyDiff("abc", ""), "abc", "empty diff returns original");

  // Apply: new file
  const newFile = applyDiff("", "--- /dev/null\n+++ b/new\n@@ -0,0 +1,1 @@\n+hello");
  assert.equal(newFile, "hello", "should create new file content");

  // Apply: skip stale hunk
  const staleResult = applyDiff("x\ny\nz", "---\n@@ -10,1 +10,1 @@\n nope\n+no");
  assert.equal(staleResult, "x\ny\nz", "should skip stale hunk unchanged");

  // Apply: append
  const appendResult = applyDiff("a\nb", "---\n@@ -2,1 +2,2 @@\n b\n+c");
  assert.equal(appendResult, "a\nb\nc", "should append at end");

  // Apply: prepend
  const prependResult = applyDiff("b\nc", "---\n@@ -1,1 +1,2 @@\n+b\n c");
  assert.equal(prependResult, "b\nb\nc", "should handle prepend");

  // Generate + Apply round-trip
  const original = "const x = 1;\nconst y = 2;\nconst z = 3;";
  const modified = "const x = 10;\nconst y = 20;\nconst z = 30;";
  const roundDiff = generateDiff(original, modified);
  assert.equal(applyDiff(original, roundDiff), modified, "round-trip generate → apply");

  // Multi-hunk round-trip
  const orig2 = "a\nb\nc\nd\ne\nf\ng";
  const mod2 = "a\nX\nc\nY\ne\nZ\ng";
  const diff2 = generateDiff(orig2, mod2);
  assert.equal(applyDiff(orig2, diff2), mod2, "multi-hunk round-trip");

  // Generator basic
  const gDiff = generateDiff("hello\nworld", "hello\nuniverse");
  assert.ok(gDiff.includes("-world"), "generated diff should contain removed line");
  assert.ok(gDiff.includes("+universe"), "generated diff should contain added line");
};
