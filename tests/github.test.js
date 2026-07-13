module.exports = function test(assert) {
  const github = require("../agent/github/index");
  const issues = require("../agent/github/issues");
  const pr = require("../agent/github/pr");
  const api = require("../agent/github/api");

  // API module
  assert.ok(typeof api.get === "function", "api should have get function");
  assert.ok(typeof api.post === "function", "api should have post function");
  assert.ok(typeof api.isAuthenticated === "function", "api should have isAuthenticated");

  const authed = api.isAuthenticated();
  assert.equal(typeof authed, "boolean", "isAuthenticated should return boolean");
  assert.ok(authed === !!process.env.GITHUB_TOKEN || authed === !!process.env.GH_TOKEN || !authed, "auth check should work");

  // Issues module
  assert.ok(typeof issues.get === "function", "issues should have get");
  assert.ok(typeof issues.getComments === "function", "issues should have getComments");
  assert.ok(typeof issues.analyze === "function", "issues should have analyze");

  const mockIssue = {
    number: 42, title: "Fix login bug", body: "Users cannot log in when token expires",
    state: "open", labels: [{ name: "bug" }, { name: "high" }],
    user: { login: "testuser" }, created_at: "2024-01-01", comments: 3, html_url: "https://github.com/test/repo/issues/42",
  };
  const analysis = issues.analyze(mockIssue);
  assert.equal(analysis.number, 42, "should extract issue number");
  assert.equal(analysis.title, "Fix login bug", "should extract issue title");
  assert.equal(analysis.type, "bug", "should detect bug type from labels");
  assert.equal(analysis.priority, "high", "should detect high priority from labels");
  assert.ok(analysis.summary.includes("Fix login bug"), "summary should include title");

  // Feature type detection
  const featureIssue = { number: 2, title: "Add dark mode", body: "New feature request", state: "open", labels: [{ name: "feature" }], user: {}, created_at: "", comments: 0, html_url: "" };
  const featureAnalysis = issues.analyze(featureIssue);
  assert.equal(featureAnalysis.type, "feature", "should detect feature type");

  // PR module
  assert.ok(typeof pr.get === "function", "pr should have get");
  assert.ok(typeof pr.getFiles === "function", "pr should have getFiles");
  assert.ok(typeof pr.getCommits === "function", "pr should have getCommits");
  assert.ok(typeof pr.getReviews === "function", "pr should have getReviews");
  assert.ok(typeof pr.create === "function", "pr should have create");
  assert.ok(typeof pr.analyze === "function", "pr should have analyze");

  const mockPR = { number: 100, title: "Add tests", body: "Adding unit tests", state: "open", user: { login: "dev" }, base: { ref: "main" }, head: { ref: "feature" }, created_at: "2024-01-01", updated_at: "2024-01-02", html_url: "https://github.com/test/repo/pull/100", additions: 150, deletions: 30, changedFiles: 5 };
  const prAnalysis = pr.analyze(mockPR);
  assert.equal(prAnalysis.number, 100, "should extract PR number");
  assert.equal(prAnalysis.title, "Add tests", "should extract PR title");
  assert.equal(prAnalysis.changes.files, 5, "should extract file count");
  assert.equal(prAnalysis.changes.additions, 150, "should extract additions");
  assert.ok(prAnalysis.score > 0, "should calculate score");

  // Large PR warning
  const largePR = { number: 101, title: "Big refactor", body: "", state: "open", user: { login: "dev" }, base: { ref: "main" }, head: { ref: "refactor" }, created_at: "", updated_at: "", html_url: "", additions: 600, deletions: 200, changedFiles: 25 };
  const largeAnalysis = pr.analyze(largePR);
  assert.ok(largeAnalysis.issues.length > 0, "should warn about large PR");
  assert.ok(largeAnalysis.score < 0.5, "large PR should have lower score");

  // GitHub index
  assert.ok(typeof github.analyzeIssue === "function", "github facade should have analyzeIssue");
  assert.ok(typeof github.reviewPR === "function", "github facade should have reviewPR");
  assert.ok(typeof github.createPR === "function", "github facade should have createPR");
  assert.ok(typeof github.getRepoFromGit === "function", "github facade should have getRepoFromGit");
};
