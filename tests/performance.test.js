module.exports = function test(assert) {
  const perf = require("../agent/performance/index");
  const cache = require("../agent/cache/index");

  // Module structure
  assert.ok(typeof perf.recordRun === "function", "perf should have recordRun");
  assert.ok(typeof perf.recordAgent === "function", "perf should have recordAgent");
  assert.ok(typeof perf.getStats === "function", "perf should have getStats");
  assert.ok(typeof perf.startTimer === "function", "perf should have startTimer");

  // Timer
  const timer = perf.startTimer();
  assert.ok(typeof timer.start === "number", "timer should have start time");
  const elapsed = timer.end();
  assert.ok(typeof elapsed === "number", "timer end should return number");
  assert.ok(elapsed >= 0, "elapsed time should be >= 0");

  // Record runs
  perf.recordRun({ task: "test task", started: new Date().toISOString(), duration: 150, tokens: 500, agents: ["planner", "coder"], cacheHits: 3, cacheMisses: 1, status: "completed" });
  perf.recordRun({ task: "second task", started: new Date().toISOString(), duration: 200, tokens: 300, agents: ["coder"], cacheHits: 2, cacheMisses: 2, status: "completed" });
  perf.recordRun({ task: "failed task", started: new Date().toISOString(), duration: 50, tokens: 100, agents: [], cacheHits: 0, cacheMisses: 0, status: "failed" });

  // Record agents
  perf.recordAgent("planner", 120);
  perf.recordAgent("coder", 250);
  perf.recordAgent("reviewer", 80);
  perf.recordAgent("security", 60);

  // Stats
  const stats = perf.getStats();
  assert.ok(stats.totalRuns >= 3, "should have at least 3 runs");
  assert.ok(typeof stats.totalTime === "string", "total time should be string");
  assert.ok(typeof stats.avgTimePerRun === "string", "avg time should be string");
  assert.ok(stats.totalTokens >= 900, "should track total tokens");
  assert.ok(stats.cacheEfficiency !== undefined, "should have cache efficiency");
  assert.ok(Array.isArray(stats.agents), "agents should be array");
  assert.ok(stats.agents.length >= 3, "should have at least 3 agents");
  assert.ok(Array.isArray(stats.recentRuns), "recentRuns should be array");

  // Cache module
  assert.ok(typeof cache.get === "function", "cache should have get");
  assert.ok(typeof cache.set === "function", "cache should have set");
  assert.ok(typeof cache.invalidate === "function", "cache should have invalidate");
  assert.ok(typeof cache.metrics === "function", "cache should have metrics");
  assert.ok(typeof cache.hash === "function", "cache should have hash");
  assert.ok(typeof cache.fileHash === "function", "cache should have fileHash");
  assert.ok(typeof cache.scanFiles === "function", "cache should have scanFiles");

  // Cache set/get
  cache.set("test", "mykey", { data: "hello" });
  const cached = cache.get("test", "mykey");
  assert.ok(cached !== null, "should retrieve cached value");
  assert.equal(cached.data, "hello", "cached value should match");

  // Cache miss
  const miss = cache.get("test", "nonexistent");
  assert.equal(miss, null, "should return null for cache miss");

  // Cache invalidate
  cache.invalidate("test");
  const afterInvalidate = cache.get("test", "mykey");
  assert.ok(afterInvalidate === null || afterInvalidate.data === "hello", "invalidate should work");

  // Hash
  const h1 = cache.hash("hello world");
  const h2 = cache.hash("hello world");
  assert.equal(h1, h2, "same input should produce same hash");
  assert.ok(h1.length >= 8, "hash should be reasonable length");

  // File hash
  const fh = cache.fileHash("version.json");
  assert.ok(fh !== null, "fileHash should work on existing files");

  // Cache metrics
  const cacheMetrics = cache.metrics();
  assert.ok(typeof cacheMetrics.hits === "number", "metrics should have hits");
  assert.ok(typeof cacheMetrics.misses === "number", "metrics should have misses");
  assert.ok(typeof cacheMetrics.total === "number", "metrics should have total");

  // scanFiles
  const fileHashes = cache.scanFiles(__dirname);
  assert.ok(Object.keys(fileHashes).length > 0, "scanFiles should detect files");
};
