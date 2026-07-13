const memory = require("../agent/memory/index");
const log = require("../agent/logger").get();

const agent = {
  name: "planner-agent",
  version: "1.0.0",

  analyze(context, task) {
    log.info(`[PLANNER] Analyzing task: ${task}`, "AGENT");
    const similar = memory.search.byTask(task);
    const recommendations = memory.recommend.recommend(task);
    const files = context.topFiles || [];
    const priority = files.length > 20 ? "high" : files.length > 10 ? "medium" : "low";
    const risk = context.totalFunctions > 50 ? "high" : context.totalFunctions > 20 ? "medium" : "low";

    return {
      task,
      priority,
      risk,
      estimatedFiles: Math.min(files.length, 10),
      similarTasks: similar.filter(s => s.status === "completed").length,
      previousFailures: similar.filter(s => s.status === "failed").length,
      recommendations: recommendations.suggestions || [],
      warnings: recommendations.warnings || [],
      analysis: `Planning ${priority} priority task affecting ~${Math.min(files.length, 10)} files`,
    };
  },

  execute(context, analysis) {
    log.info("[PLANNER] Building execution plan", "AGENT");
    const steps = [
      { action: "analyze", label: "Analyze repository context", type: "analysis" },
      { action: "modify", label: "Apply code changes", type: "pr" },
      { action: "validate", label: "Run validation", type: "checks" },
      { action: "finalize", label: "Commit changes", type: "commit" },
    ];

    return {
      task: analysis.task,
      priority: analysis.priority,
      risk: analysis.risk,
      steps,
      estimatedFiles: analysis.estimatedFiles,
      confidence: analysis.previousFailures > 0 ? 0.5 : 0.8,
    };
  },

  review(executionResult) {
    const ok = executionResult && !executionResult.error;
    return {
      agent: agent.name,
      approved: ok,
      issues: ok ? [] : [executionResult.error || "Execution failed"],
      suggestions: ok ? [] : ["Review plan steps"],
    };
  },
};

module.exports = agent;
