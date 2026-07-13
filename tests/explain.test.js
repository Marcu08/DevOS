module.exports = function test(assert) {
  const explain = require("../agent/explain/index");

  // Module structure
  assert.ok(typeof explain.record === "function", "explain should have record");
  assert.ok(typeof explain.getRecent === "function", "explain should have getRecent");
  assert.ok(typeof explain.getByTask === "function", "explain should have getByTask");
  assert.ok(typeof explain.buildDecisionExplanation === "function", "explain should have buildDecisionExplanation");
  assert.ok(typeof explain.formatForCLI === "function", "explain should have formatForCLI");
  assert.ok(typeof explain.buildSummary === "function", "explain should have buildSummary");

  // Record an explanation
  const details = {
    reasoning: ["All agents approved", "No critical issues"],
    confidence: 0.95,
    evidence: [{ type: "review_score", value: 0.95 }],
    filesChanged: ["src/index.js", "src/app.js"],
    similarSolutions: [{ task: "fix auth", status: "completed", confidence: 0.8 }],
    decision: "COMMIT",
    agents: ["planner-agent", "coder-agent"],
  };
  const record = explain.record("Add login feature", details);
  assert.ok(record.task === "Add login feature", "should record task name");
  assert.ok(Array.isArray(record.reasoning), "should store reasoning array");
  assert.equal(record.reasoning[0], "All agents approved", "should store reasoning text");
  assert.ok(record.confidence === 0.95, "should store confidence");
  assert.ok(Array.isArray(record.evidence), "should store evidence");
  assert.ok(Array.isArray(record.filesChanged), "should store files changed");
  assert.ok(record.decision === "COMMIT", "should store decision");
  assert.ok(record.summary.length > 0, "should build summary string");

  // Build decision explanation
  const ctx = { topFiles: [{ file: "src/index.js" }, { file: "src/app.js" }] };
  const orchResult = {
    decision: "COMMIT",
    summary: { patchesGenerated: 2, reviewScore: 0.95, securityFindings: 0 },
    agents: {
      planner: { review: { approved: true } },
      coder: { review: { approved: true } },
      reviewer: { review: { approved: true, issues: [] } },
      security: { review: { approved: true } },
    },
  };
  const decisionExp = explain.buildDecisionExplanation("Fix auth", "COMMIT", ctx, orchResult);
  assert.ok(decisionExp.task === "Fix auth", "decision explanation should have task");
  assert.ok(Array.isArray(decisionExp.reasoning), "decision explanation should have reasoning");
  assert.ok(decisionExp.decision === "COMMIT", "decision explanation should have decision");
  assert.ok(decisionExp.confidence > 0, "decision explanation should have confidence");

  // Build decision explanation for ROLLBACK
  const rollbackExp = explain.buildDecisionExplanation("Bad task", "ROLLBACK", ctx, {
    decision: "ROLLBACK",
    summary: { patchesGenerated: 0, reviewScore: 0, securityFindings: 2 },
    agents: { reviewer: { approved: false, issues: ["failed"] }, security: { approved: false, issues: ["critical"] } },
  });
  assert.ok(rollbackExp.decision === "ROLLBACK", "rollback decision should be ROLLBACK");
  assert.ok(rollbackExp.reasoning.length > 0, "rollback should have reasoning");

  // buildSummary
  const summary = explain.buildSummary("Test task", {
    reasoning: ["Agent approved"],
    confidence: 0.85,
    decision: "COMMIT",
  });
  assert.ok(summary.includes("Test task"), "summary should include task");
  assert.ok(summary.includes("Confidence: 85%"), "summary should include confidence");
  assert.ok(summary.includes("COMMIT"), "summary should include decision");

  // formatForCLI
  const formatted = explain.formatForCLI(decisionExp);
  assert.ok(formatted.task === "Fix auth", "CLI format should have task");
  assert.ok(formatted.confidence !== undefined, "CLI format should have confidence");

  // getRecent
  const recent = explain.getRecent(5);
  assert.ok(Array.isArray(recent), "getRecent should return array");
};
