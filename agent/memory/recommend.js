const similarity = require("./similarity");
const patterns = require("./patterns");

function recommend(task, error, context) {
  const warnings = [];
  const suggestions = [];

  if (task) {
    const similarTasks = similarity.findSimilarTasks(task);
    if (similarTasks.length > 0) {
      const prev = similarTasks[0];
      if (prev.run.status === "failed") {
        warnings.push(`Similar task "${prev.run.task.slice(0, 60)}" previously failed`);
      }
      if (prev.run.status === "completed") {
        suggestions.push(`Similar task "${prev.run.task.slice(0, 60)}" completed successfully`);
      }
    }

    const similarSolutions = similarity.findSimilarSolutions(task);
    if (similarSolutions.length > 0) {
      suggestions.push(`Found ${similarSolutions.length} cached solution(s) for similar tasks`);
    }
  }

  if (error) {
    const similarErrors = similarity.findSimilarMistakes(error);
    if (similarErrors.length > 0) {
      warnings.push(`Similar error detected in ${similarErrors.length} previous execution(s)`);
      for (const e of similarErrors.slice(0, 2)) {
        suggestions.push(`Previous fix: ${(e.mistake.error || "").slice(0, 80)}`);
      }
    }
  }

  if (context && context.file) {
    const filePatterns = patterns.suggest(context.file);
    if (filePatterns.length > 0) {
      const best = filePatterns[0];
      const rate = Math.round(best.successRate * 100);
      suggestions.push(`Pattern for "${best.file}": ${rate}% success rate (${best.count} uses)`);
    }
  }

  return { warnings, suggestions, hasWarnings: warnings.length > 0, hasSuggestions: suggestions.length > 0 };
}

module.exports = { recommend };
