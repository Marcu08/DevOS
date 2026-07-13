const out = require("../output");
const github = require("../../github/index");

async function handler(args) {
  const sub = args[0];

  if (sub === "analyze") {
    const issueNum = parseInt(args[1], 10);
    if (!issueNum) {
      out.error("Usage: node cli.js issue analyze <issue-number>");
      return;
    }
    const repo = github.getRepoFromGit();
    if (!repo) {
      out.error("Not in a GitHub repository");
      return;
    }
    out.banner(`Analyzing Issue #${issueNum}`);
    const analysis = await github.analyzeIssue(repo.owner, repo.repo, issueNum);
    if (!analysis) {
      out.error("Failed to fetch issue");
      return;
    }
    out.status("ok", "ok", analysis.title);
    out.status("info", "ok", `Type: ${analysis.type}`);
    out.status("info", "ok", `Priority: ${analysis.priority}`);
    out.status("info", "ok", `Complexity: ${analysis.complexity}`);
    out.status("info", "ok", `Author: ${analysis.author}`);
    out.status("info", "ok", `Labels: ${analysis.labels.join(", ") || "none"}`);
    out.status("info", "ok", `Comments: ${analysis.totalComments}`);
    out.status("info", "ok", `URL: ${analysis.url}`);
    return;
  }

  out.error("Unknown subcommand. Available: analyze");
}

module.exports = { handler, description: "GitHub issue operations (analyze)" };
