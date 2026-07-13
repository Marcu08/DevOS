const history = require("./history");
const mistakes = require("./mistakes");
const solutions = require("./solutions");

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !["the", "and", "for", "this", "with", "that", "from"].includes(w));
}

function score(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const matches = tokensA.filter(t => tokensB.includes(t)).length;
  return matches / Math.max(tokensA.length, tokensB.length);
}

function findSimilarTasks(task, limit = 3) {
  const data = history.load().runs || [];
  return data
    .map(r => ({ run: r, score: score(task, r.task || "") }))
    .filter(r => r.score > 0.1 && r.run.task !== task)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function findSimilarMistakes(error, limit = 3) {
  const data = mistakes.load().mistakes || [];
  return data
    .map(m => ({ mistake: m, score: score(error, m.error || "") }))
    .filter(m => m.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function findSimilarSolutions(task, limit = 3) {
  const data = solutions.load().solutions || [];
  return data
    .map(s => ({ solution: s, score: score(task, s.task || "") }))
    .filter(s => s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { tokenize, score, findSimilarTasks, findSimilarMistakes, findSimilarSolutions };
