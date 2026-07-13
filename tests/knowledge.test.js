module.exports = function test(assert) {
  const knowledge = require("../agent/memory/knowledge/index");
  const graph = require("../agent/memory/knowledge/graph");

  // Module structure
  assert.ok(typeof knowledge.learn === "function", "knowledge should have learn");
  assert.ok(typeof knowledge.search === "function", "knowledge should have search");
  assert.ok(typeof knowledge.findSimilar === "function", "knowledge should have findSimilar");
  assert.ok(typeof knowledge.stats === "function", "knowledge should have stats");
  assert.ok(typeof knowledge.explain === "function", "knowledge should have explain");
  assert.ok(typeof knowledge.confidence === "function", "knowledge should have confidence");
  assert.ok(typeof knowledge.suggest === "function", "knowledge should have suggest");

  // Learn entries
  knowledge.learn("React dependency conflict", "Upgrade react-router to v6", { files: ["package.json"], projectType: "react", agent: "planner-agent", success: 0.92 });
  knowledge.learn("Authentication token expired", "Implement refresh token flow", { files: ["auth.js"], projectType: "node", agent: "coder-agent", success: 0.85 });
  knowledge.learn("CSS module not loading", "Add css-loader to webpack config", { files: ["webpack.config.js"], projectType: "react", agent: "coder-agent", success: 0.78 });
  knowledge.learn("API rate limiting", "Add express-rate-limit middleware", { files: ["server.js"], projectType: "node", agent: "coder-agent", success: 0.95 });
  knowledge.learn("Memory leak in websocket", "Implement connection cleanup on close", { files: ["ws-handler.js"], projectType: "node", agent: "reviewer-agent", success: 0.88 });

  // stats
  const stats = knowledge.stats();
  assert.ok(stats.total >= 5, "should have at least 5 entries");
  assert.ok(typeof stats.avgSuccessRate === "string", "should have avg success rate");
  assert.ok(stats.totalUses >= 5, "should track total uses");

  // search
  const searchResults = knowledge.search("react");
  assert.ok(searchResults.length > 0, "should find react entries");
  assert.ok(searchResults.some(r => r.problem.includes("React")), "should match problem field");

  const searchAuth = knowledge.search("token");
  assert.ok(searchAuth.length > 0, "should find token authentication entries");

  const searchNone = knowledge.search("xyznonexistent");
  assert.equal(searchNone.length, 0, "should return empty for no match");

  // findSimilar
  const similar = knowledge.findSimilar("CSS loading problem");
  assert.ok(similar.length > 0, "should find similar by text matching");

  // findByFile
  const fileResults = knowledge.findByFile("package.json");
  assert.ok(fileResults.some(r => r.files.includes("package.json")), "should find by file");

  // confidence
  const conf = knowledge.confidence("React dependency");
  assert.ok(typeof conf === "number", "confidence should be numeric");
  assert.ok(conf >= 0 && conf <= 1, "confidence should be 0-1");

  // suggest
  const suggestions = knowledge.suggest("react problem", { files: ["package.json"] });
  assert.ok(suggestions.length > 0, "should suggest based on task and files");
  assert.ok(suggestions[0].confidence !== undefined, "suggestions should have confidence");

  // explain
  const entries = graph.load().entries;
  if (entries.length > 0) {
    const exp = knowledge.explain(entries[0].id);
    assert.ok(exp !== null, "explain should return entry");
    assert.ok(exp.entry.problem, "explanation should have problem");
    assert.ok(exp.entry.solution, "explanation should have solution");
  }

  // Graph module
  assert.ok(typeof graph.addEntry === "function", "graph should have addEntry");
  assert.ok(typeof graph.addRelationship === "function", "graph should have addRelationship");
  assert.ok(typeof graph.search === "function", "graph should have search");
  assert.ok(typeof graph.stats === "function", "graph should have stats");
  assert.ok(typeof graph.explain === "function", "graph should have explain");

  // Relationship
  graph.addRelationship(1, 2, "related");
  const expRels = graph.explain(1);
  if (expRels) assert.ok(Array.isArray(expRels.relationships), "explain should have relationships");
};
