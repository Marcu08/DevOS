const graph = require("./graph");

function learn(problem, solution, context) {
  graph.addEntry({
    problem,
    solution,
    files: context.files || [],
    projectType: context.projectType || "unknown",
    agent: context.agent || "unknown",
    success: context.success !== undefined ? context.success : 1,
  });
  if (context.relatedId) {
    const entries = graph.load().entries;
    const match = entries.find(e => e.problem === problem && e.solution === solution);
    if (match) graph.addRelationship(match.id, context.relatedId, context.relationType || "related");
  }
}

function search(query) {
  return graph.search(query);
}

function findSimilar(problem) {
  return graph.getSimilar(problem, 5);
}

function findByProblem(problem) {
  return graph.findByProblem(problem);
}

function findByFile(file) {
  return graph.findByFile(file);
}

function stats() {
  return graph.stats();
}

function explain(entryId) {
  return graph.explain(entryId);
}

function confidence(problem) {
  const similar = graph.getSimilar(problem, 3);
  if (similar.length === 0) return 0;
  return similar.reduce((s, e) => s + e.confidence, 0) / similar.length;
}

function suggest(task, context) {
  const similar = graph.getSimilar(task, 3);
  const byFile = context?.files ? context.files.flatMap(f => graph.findByFile(f)) : [];
  const combined = [...similar, ...byFile];
  const seen = new Set();
  return combined.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  }).sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

module.exports = { learn, search, findSimilar, findByProblem, findByFile, stats, explain, confidence, suggest };
