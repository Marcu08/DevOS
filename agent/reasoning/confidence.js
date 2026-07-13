const DEVOS = require("../config");

function run(plan, context) {
  const files = plan.filesInvolved || [];
  const totalFiles = context.totalFiles || 1;
  const complexity = plan.estimatedComplexity || {};
  const threshold = DEVOS.config.reasoning?.confidenceThreshold ?? 0.6;

  let score = 1.0;

  if (files.length > 8) score -= 0.25;
  else if (files.length > 4) score -= 0.10;

  if (complexity.functions > 30) score -= 0.20;
  else if (complexity.functions > 15) score -= 0.10;

  if (plan.risk === "high") score -= 0.15;

  if (files.length === 0) score -= 0.30;

  const highComplexityFiles = (context.topFiles || []).filter(f => (f.complexity?.functions || 0) > 10);
  if (highComplexityFiles.length > 0) score -= 0.05 * Math.min(highComplexityFiles.length, 4);

  score = Math.max(0, Math.min(1, score));

  const blocked = score < threshold;

  const reasoning = [];
  if (files.length > 4) reasoning.push(`${files.length} files affected (${files.length > 8 ? "high" : "moderate"} scope)`);
  if (complexity.functions > 15) reasoning.push(`${complexity.functions} functions involved`);
  if (plan.risk === "high") reasoning.push("High risk assessment");
  if (blocked) reasoning.push(`Score below ${threshold} threshold — blocking execution`);

  return {
    confidence: Math.round(score * 100) / 100,
    blocked,
    reasoning: reasoning.length > 0 ? reasoning.join("; ") : "Standard confidence",
    filesInvolved: files.length,
    threshold,
  };
}

module.exports = { run };
