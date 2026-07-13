const history = require("./history");
const mistakes = require("./mistakes");
const patterns = require("./patterns");
const solutions = require("./solutions");
const search = require("./search");
const similarity = require("./similarity");
const recommend = require("./recommend");
const knowledge = require("./knowledge/index");
const graph = require("./knowledge/graph");

function recordRun(entry) {
  history.addRun(entry);
}

function recordMistake(task, error, context) {
  mistakes.record(task, error, context);
}

function recordPattern(file, actions, success) {
  patterns.record(file, actions, success);
}

function cacheSolution(task, solution) {
  solutions.cache(task, solution);
}

function recallSolution(task) {
  return solutions.recall(task);
}

function getStats() {
  const k = knowledge.stats();
  return {
    history: history.stats(),
    recentMistakes: mistakes.recentErrors(3),
    recentRuns: history.recent(3),
    knowledge: {
      total: k.total,
      relationships: k.relationships,
      avgSuccessRate: k.avgSuccessRate,
      totalUses: k.totalUses,
      topAgents: k.topAgents,
      topProjectTypes: k.topProjectTypes,
    },
  };
}

function learnFromFailure(task, error, context) {
  recordMistake(task, error, context);

  const similar = mistakes.similarTo(error);
  const suggestion = patterns.suggest(context?.file || "");

  const rec = recommend.recommend(task, error, context);

  // Also learn into knowledge graph
  const similarKnowledge = knowledge.findSimilar(task);
  if (similarKnowledge.length > 0) {
    const best = similarKnowledge[0];
    knowledge.learn(task, best.solution, { ...context, success: best.successRate });
  }

  return {
    similarErrors: similar.length,
    suggestedPatterns: suggestion,
    previousAttempts: similar.slice(0, 2),
    knowledgeSuggestions: similarKnowledge.slice(0, 2).map(k => ({
      problem: k.problem,
      solution: k.solution,
      confidence: k.confidence,
    })),
    warnings: rec.warnings,
    suggestions: rec.suggestions,
  };
}

module.exports = {
  recordRun, recordMistake, recordPattern, cacheSolution, recallSolution,
  getStats, learnFromFailure,
  search, similarity, recommend,
  knowledge, graph,
};
