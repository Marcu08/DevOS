const history = require("./history");
const mistakes = require("./mistakes");
const patterns = require("./patterns");
const solutions = require("./solutions");
const search = require("./search");
const similarity = require("./similarity");
const recommend = require("./recommend");

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
  return {
    history: history.stats(),
    recentMistakes: mistakes.recentErrors(3),
    recentRuns: history.recent(3),
  };
}

function learnFromFailure(task, error, context) {
  recordMistake(task, error, context);

  const similar = mistakes.similarTo(error);
  const suggestion = patterns.suggest(context?.file || "");

  const rec = recommend.recommend(task, error, context);

  return {
    similarErrors: similar.length,
    suggestedPatterns: suggestion,
    previousAttempts: similar.slice(0, 2),
    warnings: rec.warnings,
    suggestions: rec.suggestions,
  };
}

module.exports = {
  recordRun, recordMistake, recordPattern, cacheSolution, recallSolution,
  getStats, learnFromFailure,
  search, similarity, recommend,
};
