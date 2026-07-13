const log = require("../agent/logger").get();

const agent = {
  name: "reviewer-agent",
  version: "1.0.0",

  analyze(context, task) {
    log.info("[REVIEWER] Analyzing review requirements", "AGENT");
    return {
      task,
      totalFiles: context.totalFiles || 0,
      filesToReview: (context.topFiles || []).slice(0, 10).map(f => f.file),
      contextSize: context.totalFiles,
    };
  },

  execute(context, analysis) {
    return this.review(context, analysis, null);
  },

  review(context, analysis, coderResult) {
    log.info("[REVIEWER] Reviewing proposed changes", "AGENT");
    const issues = [];
    const warnings = [];
    let score = 1.0;

    if (!coderResult || !coderResult.patches || coderResult.patches.length === 0) {
      issues.push("No code changes to review");
      score = 0;
    } else {
      for (const patch of coderResult.patches) {
        if (patch.content && patch.content.length > 5000) {
          warnings.push(`Large patch for ${patch.file} (${patch.content.length} chars)`);
          score -= 0.1;
        }
        if (patch.content && !patch.content.includes("\n")) {
          issues.push(`Patch for ${patch.file} appears incomplete (single line)`);
          score -= 0.3;
        }
      }
    }

    const result = {
      agent: agent.name,
      approved: issues.length === 0,
      score: Math.max(0, score),
      issues,
      warnings,
      patchCount: coderResult?.patches?.length || 0,
    };

    log.info(`[REVIEWER] Score: ${result.score}, Issues: ${issues.length}`, "AGENT");
    return result;
  },
};

module.exports = agent;
