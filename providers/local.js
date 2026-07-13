const log = require("../agent/logger").get();

const MODEL = "local-fallback";

async function generate(prompt) {
  log.info("[LOCAL AI] Generating response (simulated)", "PROVIDER");
  return {
    content: JSON.stringify({
      reasoning: "Local provider — simulated analysis",
      files: [],
      plan: { steps: [{ action: "analyze", label: "Analyze codebase" }] },
    }),
    usage: { prompt_tokens: 0, completion_tokens: 0 },
    model: MODEL,
  };
}

async function analyze(context, task) {
  log.info("[LOCAL AI] Analyzing task (simulated)", "PROVIDER");
  const fileCount = (context.topFiles || []).length;
  return {
    confidence: 0.3,
    priority: fileCount > 20 ? "high" : "medium",
    complexity: fileCount > 30 ? "high" : "medium",
    analysis: `Local analysis of task "${task}" across ${fileCount} files`,
  };
}

async function review(code, context) {
  log.info("[LOCAL AI] Reviewing code (simulated)", "PROVIDER");
  return {
    issues: [],
    score: 0.5,
    approved: true,
    analysis: "Local provider — no automated review available",
  };
}

function isAvailable() { return true; }

module.exports = { generate, analyze, review, isAvailable };
