const issues = require("./issues");
const pr = require("./pr");
const api = require("./api");

function getRepoFromGit() {
  try {
    const fs = require("fs");
    const gitConfig = fs.readFileSync(".git/config", "utf8");
    const match = gitConfig.match(/url\s*=\s*.*github\.com[:\/](.+)\/(.+)\.git/);
    if (match) return { owner: match[1], repo: match[2] };
    const matchHttps = gitConfig.match(/url\s*=\s*https:\/\/github\.com\/(.+)\/(.+?)\.git/);
    if (matchHttps) return { owner: matchHttps[1], repo: matchHttps[2] };
  } catch (_) {}
  return null;
}

async function analyzeIssue(owner, repo, issueNumber) {
  const issue = await issues.get(owner, repo, issueNumber);
  if (issue.error) return null;
  const comments = await issues.getComments(owner, repo, issueNumber);
  const analysis = issues.analyze(issue);
  analysis.comments = comments;
  analysis.totalComments = comments.length;
  return analysis;
}

async function reviewPR(owner, repo, prNumber) {
  const pull = await pr.get(owner, repo, prNumber);
  if (pull.error) return null;
  const files = await pr.getFiles(owner, repo, prNumber);
  const reviews = await pr.getReviews(owner, repo, prNumber);
  const analysis = pr.analyze(pull);
  analysis.files = files;
  analysis.reviews = reviews;
  return analysis;
}

async function createPR(owner, repo, title, body, head, base) {
  return await pr.create(owner, repo, title, body, head, base);
}

function status() {
  const authenticated = api.isAuthenticated();
  const repo = getRepoFromGit();
  return { authenticated, repo };
}

module.exports = { analyzeIssue, reviewPR, createPR, getRepoFromGit, status, issues, pr, api };
