module.exports = function test(assert) {
  const sim = require("../agent/memory/similarity");

  // Tokenize
  const t1 = sim.tokenize("Add dark mode support to website");
  assert.ok(t1.includes("dark"), "should tokenize 'dark'");
  assert.ok(t1.includes("mode"), "should tokenize 'mode'");
  assert.ok(t1.includes("support"), "should tokenize 'support'");
  assert.ok(!t1.includes("to"), "should filter stop words");

  const t2 = sim.tokenize("");
  assert.equal(t2.length, 0, "empty text should give empty tokens");

  // Score
  const high = sim.score("fix react import error", "resolve react import issue");
  assert.ok(high > 0.2, "similar texts should score > 0.2");

  const low = sim.score("add dark mode", "upgrade database schema");
  assert.ok(low < 0.3, "different texts should score < 0.3");

  const identical = sim.score("same task", "same task");
  assert.equal(identical, 1, "identical texts should score 1.0");

  // Find similar tasks (will use in-memory data since we recorded in memory tests)
  const tasks = sim.findSimilarTasks("add dark mode", 3);
  assert.ok(Array.isArray(tasks), "should return array");
  tasks.forEach(t => {
    assert.ok(t.score >= 0, "each result should have score");
    assert.ok(t.run !== undefined, "each result should have run data");
  });

  // Find similar mistakes
  const errs = sim.findSimilarMistakes("syntax error");
  assert.ok(Array.isArray(errs), "should return array for mistakes");
};
