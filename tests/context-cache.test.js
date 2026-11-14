module.exports = function test(assert) {
  const context = require("../agent/context");
  const cache = require("../agent/cache/index");

  // Context shape, built without cache so the test is deterministic.
  const ctx = context.buildContext({ cache: false });
  assert.ok(ctx.totalFiles > 0, "context should scan files");
  assert.ok(Array.isArray(ctx.topFiles), "context should have topFiles");
  assert.ok(ctx.topFiles.length <= 20, "topFiles should be capped at 20");
  assert.equal(Object.keys(ctx.dependencyMap).length, ctx.totalFiles, "dependencyMap should cover every file");
  assert.ok(ctx.exportsMap && typeof ctx.exportsMap === "object", "context should have exportsMap");
  assert.ok(ctx.timestamp, "context should have a timestamp");

  // Cache round-trip. This also covers the Windows-safe cache filename: keys
  // containing ":" used to create NTFS alternate data streams.
  const key = `cache-test-${Date.now()}`;
  cache.set("unit", key, { ok: true, value: 42 });
  const hit = cache.get("unit", key);
  assert.ok(hit !== null, "cache should return a stored value");
  assert.equal(hit.value, 42, "cache should preserve the value");
  assert.equal(cache.get("unit", `${key}-missing`), null, "cache should miss unknown keys");
  cache.invalidate("unit");
};
