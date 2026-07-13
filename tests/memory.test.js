module.exports = function test(assert) {
  const history = require("../agent/memory/history");
  const mistakes = require("../agent/memory/mistakes");
  const patterns = require("../agent/memory/patterns");
  const solutions = require("../agent/memory/solutions");
  const similarity = require("../agent/memory/similarity");
  const recommend = require("../agent/memory/recommend");
  const search = require("../agent/memory/search");

  // History
  history.addRun({ task: "test-task", status: "completed", confidence: 0.8 });
  const recent = history.recent(5);
  assert.ok(recent.length >= 1, "should have at least 1 run");
  assert.equal(recent[0].task, "test-task", "should store task");
  assert.ok(recent[0].id > 0, "should assign id");

  const stats = history.stats();
  assert.ok(stats.total >= 1, "stats should show total");
  assert.ok(stats.succeeded >= 1, "stats should show succeeded");

  // Mistakes
  mistakes.record("task-A", "syntax error in parser", { file: "parser.js", stage: "validation" });
  mistakes.record("task-B", "missing import react", { file: "app.js", stage: "execution" });

  const errors = mistakes.recentErrors(5);
  assert.ok(errors.length >= 2, "should store mistakes");

  const similar = mistakes.similarTo("syntax");
  assert.ok(similar.length >= 1, "should find similar errors");

  // Patterns
  patterns.record("*.js", "modify", true);
  patterns.record("*.js", "modify", true);
  patterns.record("*.css", "modify", false);

  const suggestions = patterns.suggest(".js");
  assert.ok(suggestions.length >= 1, "should suggest patterns");
  assert.ok(suggestions[0].count >= 2, "should track count");

  // Solutions
  solutions.cache("add dark mode", { files: ["style.css"], changes: "add @media" });
  const cached = solutions.recall("add dark mode");
  assert.ok(cached !== null, "should recall cached solution");

  const similarSolutions = solutions.findSimilar("dark mode");
  assert.ok(similarSolutions.length >= 1, "should find similar solutions");

  // Similarity
  const score = similarity.score("add dark mode to website", "implement dark mode for site");
  assert.ok(score > 0.3, "similar tasks should have high score");
  assert.ok(score <= 1, "score should not exceed 1");

  const lowScore = similarity.score("add dark mode", "fix database migration");
  assert.ok(lowScore < 0.3, "different tasks should have low score");

  // Tokenize
  const tokens = similarity.tokenize("add dark mode support");
  assert.ok(tokens.includes("dark"), "should extract keywords");

  // Recommend
  const rec = recommend.recommend("add dark mode", "syntax error", { file: "app.js" });
  assert.ok(typeof rec.hasWarnings === "boolean", "recommend should return warnings flag");
  assert.ok(typeof rec.hasSuggestions === "boolean", "recommend should return suggestions flag");

  // Search
  const allData = search.all();
  assert.ok(allData.history !== undefined, "search.all should return history");
  assert.ok(allData.mistakes !== undefined, "search.all should return mistakes");
  assert.ok(allData.patterns !== undefined, "search.all should return patterns");

  const taskResults = search.byTask("test-task");
  assert.ok(taskResults.length >= 1, "should find by task");

  const errorResults = search.byError("syntax");
  assert.ok(errorResults.length >= 1, "should find by error");

  const searchStats = search.stats();
  assert.ok(searchStats.runs >= 1, "search stats should show runs");
  assert.ok(typeof searchStats.successRate === "string", "search stats should have success rate");
};
