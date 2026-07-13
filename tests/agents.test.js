module.exports = function test(assert) {
  const planner = require("../agents/planner-agent");
  const coder = require("../agents/coder-agent");
  const reviewer = require("../agents/reviewer-agent");
  const security = require("../agents/security-agent");
  const orchestrator = require("../agents/orchestrator");

  // Agent structure tests
  assert.equal(planner.name, "planner-agent", "planner should have name");
  assert.equal(planner.version, "1.0.0", "planner should have version");
  assert.ok(typeof planner.analyze === "function", "planner should have analyze");
  assert.ok(typeof planner.execute === "function", "planner should have execute");
  assert.ok(typeof planner.review === "function", "planner should have review");

  assert.equal(coder.name, "coder-agent", "coder should have name");
  assert.equal(coder.version, "1.0.0", "coder should have version");
  assert.ok(typeof coder.analyze === "function", "coder should have analyze");
  assert.ok(typeof coder.execute === "function", "coder should have execute");
  assert.ok(typeof coder.review === "function", "coder should have review");

  assert.equal(reviewer.name, "reviewer-agent", "reviewer should have name");
  assert.ok(typeof reviewer.review === "function", "reviewer should have review");

  assert.equal(security.name, "security-agent", "security agent should have name");
  assert.ok(typeof security.analyze === "function", "security should have analyze");
  assert.ok(typeof security.execute === "function", "security should have execute");
  assert.ok(typeof security.review === "function", "security should have review");

  // Planner analyze
  const ctx = { topFiles: [{ file: "index.js", functions: 5 }, { file: "app.js", functions: 10 }], totalFunctions: 15 };
  const analysis = planner.analyze(ctx, "test task");
  assert.ok(analysis.task === "test task", "planner analyze should return task");
  assert.ok(typeof analysis.priority === "string", "priority should be a string");
  assert.ok(analysis.risk === "low", "15 functions should be low risk");

  // Planner execute
  const plan = planner.execute(ctx, analysis);
  assert.ok(Array.isArray(plan.steps), "plan should have steps array");
  assert.ok(plan.steps.length >= 3, "plan should have at least 3 steps");
  assert.ok(plan.steps.some(s => s.action === "modify"), "plan should include modify step");

  // Planner review
  const plannerReview = planner.review({ modifiedFiles: ["index.js"], error: null });
  assert.ok(plannerReview.approved === true, "planner review should approve success");

  // Coder analyze
  const coderAnalysis = coder.analyze(ctx, "test task");
  assert.ok(coderAnalysis.task === "test task", "coder analyze should return task");
  assert.ok(Array.isArray(coderAnalysis.filesToModify), "coder should list files");
  assert.ok(coderAnalysis.language, "coder should detect language");

  // Coder review
  const coderReviewGood = coder.review({ patches: [{ file: "test.js", content: "abc\n123\n" }] });
  assert.ok(coderReviewGood.approved === true, "coder should approve valid patches");

  const coderReviewBad = coder.review({ patches: [] });
  assert.ok(coderReviewBad.approved === false, "coder should reject empty patches");

  // Reviewer agent
  const revResult = reviewer.review(ctx, null, { patches: [{ file: "test.js", content: "line1\nline2\n" }] });
  assert.ok(typeof revResult.score === "number", "review should have numeric score");
  assert.ok(revResult.score >= 0 && revResult.score <= 1, "review score should be 0-1");

  const revEmpty = reviewer.review(ctx, null, { patches: [] });
  assert.ok(revEmpty.approved === false, "reviewer should reject empty patches");
  assert.ok(revEmpty.score === 0, "reviewer score should be 0 for empty");

  // Large patch warning
  const revLarge = reviewer.review(ctx, null, { patches: [{ file: "big.js", content: "x".repeat(6000) }] });
  assert.ok(revLarge.warnings.length > 0, "reviewer should warn about large patches");
  assert.ok(revLarge.score < 1, "large patch should reduce score");

  // Orchestrator
  const agents = orchestrator.available();
  assert.ok(Array.isArray(agents), "orchestrator should list agents");
  assert.ok(agents.length >= 4, "should have at least 4 agents");
  assert.ok(agents.some(a => a.name === "planner-agent"), "should include planner");
  assert.ok(agents.some(a => a.name === "coder-agent"), "should include coder");
  assert.ok(agents.some(a => a.name === "reviewer-agent"), "should include reviewer");
  assert.ok(agents.some(a => a.name === "security-agent"), "should include security");

  // Decision report
  const mockResult = {
    task: "test",
    decision: "COMMIT",
    agents: { planner: { approved: true }, coder: { approved: true }, reviewer: { review: { approved: true, issues: [] } }, security: { review: { approved: true, issues: [] } } },
    summary: { patchesGenerated: 3, reviewScore: 0.9, securityFindings: 0, plannerPriority: "medium", plannerRisk: "low" },
  };
  const report = orchestrator.createDecisionReport(mockResult);
  assert.ok(report.task === "test", "report should have task");
  assert.ok(report.decision === "COMMIT", "report should have decision");
  assert.ok(Array.isArray(report.agents), "report should have agents array");
};
