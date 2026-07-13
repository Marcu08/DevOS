const api = require("./api");

async function get(owner, repo, issueNumber) {
  const data = await api.get(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  return {
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.state,
    labels: (data.labels || []).map(l => l.name),
    author: data.user?.login,
    created: data.created_at,
    comments: data.comments,
    url: data.html_url,
  };
}

async function getComments(owner, repo, issueNumber) {
  const data = await api.get(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
  return (data || []).map(c => ({
    id: c.id,
    author: c.user?.login,
    body: c.body,
    created: c.created_at,
  }));
}

function analyze(issue) {
  const typeKeywords = { bug: ["bug", "error", "crash", "fix", "broken", "issue"], feature: ["feature", "request", "enhancement", "new"], docs: ["docs", "documentation", "readme"] };
  const labels = (issue.labels || []).map(l => typeof l === "string" ? l.toLowerCase() : (l.name || "").toLowerCase());
  const body = (issue.body || "").toLowerCase();
  const title = issue.title.toLowerCase();

  let type = "task";
  for (const [t, keywords] of Object.entries(typeKeywords)) {
    if (labels.includes(t) || keywords.some(k => title.includes(k) || body.includes(k))) {
      type = t;
      break;
    }
  }

  const priority = labels.includes("high") || labels.includes("critical") ? "high"
    : labels.includes("medium") ? "medium"
    : labels.includes("low") ? "low"
    : "medium";

  const complexity = (body.length > 2000 ? "high" : body.length > 500 ? "medium" : "low");

  return {
    number: issue.number,
    title: issue.title,
    type,
    priority,
    complexity,
    labels: issue.labels,
    author: issue.author,
    url: issue.url,
    bodyLength: issue.body?.length || 0,
    commentCount: issue.comments || 0,
    summary: `${type} issue #${issue.number}: ${issue.title} (${priority} priority, ${complexity} complexity)`,
  };
}

module.exports = { get, getComments, analyze };
