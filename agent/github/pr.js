const api = require("./api");

async function get(owner, repo, prNumber) {
  const data = await api.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  return {
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.state,
    author: data.user?.login,
    base: data.base?.ref,
    head: data.head?.ref,
    created: data.created_at,
    updated: data.updated_at,
    url: data.html_url,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changed_files,
  };
}

async function getFiles(owner, repo, prNumber) {
  const data = await api.get(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);
  return (data || []).map(f => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));
}

async function getCommits(owner, repo, prNumber) {
  const data = await api.get(`/repos/${owner}/${repo}/pulls/${prNumber}/commits`);
  return (data || []).map(c => ({
    sha: c.sha,
    message: c.commit?.message,
    author: c.commit?.author?.name,
    date: c.commit?.author?.date,
  }));
}

async function getReviews(owner, repo, prNumber) {
  const data = await api.get(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
  return (data || []).map(r => ({
    id: r.id,
    state: r.state,
    author: r.user?.login,
    body: r.body,
    submitted: r.submitted_at,
  }));
}

async function create(owner, repo, title, body, head, base) {
  const result = await api.post(`/repos/${owner}/${repo}/pulls`, { title, body, head, base });
  if (result.error) return { error: true, message: result.message };
  return { number: result.number, url: result.html_url, state: result.state };
}

function analyze(pr) {
  const issues = [];
  if (pr.additions > 500) issues.push("Large PR (>500 additions) — consider splitting");
  if (pr.changedFiles > 20) issues.push("Many files changed (>20) — review carefully");
  if (pr.deletions > pr.additions * 2) issues.push("High deletion ratio — verify nothing lost");

  const score = Math.max(0, 1 - (pr.changedFiles * 0.02 + pr.additions * 0.001));
  return {
    number: pr.number,
    title: pr.title,
    author: pr.author,
    changes: { files: pr.changedFiles, additions: pr.additions, deletions: pr.deletions },
    issues,
    score,
    summary: `PR #${pr.number}: ${pr.title} (${pr.additions}+ / ${pr.deletions}- in ${pr.changedFiles} files)`,
  };
}

module.exports = { get, getFiles, getCommits, getReviews, create, analyze };
