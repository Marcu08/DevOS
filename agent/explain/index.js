const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");
const memory = require("../memory/index");
const log = require("../logger").get();

function record(task, details) {
  const record = {
    task,
    timestamp: new Date().toISOString(),
    reasoning: details.reasoning || [],
    confidence: details.confidence || 0,
    evidence: details.evidence || [],
    filesChanged: details.filesChanged || [],
    similarSolutions: details.similarSolutions || [],
    decision: details.decision || "unknown",
    agents: details.agents || [],
    summary: buildSummary(task, details),
  };
  const dir = DEVOS.logs;
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "explain.json");
  let existing = [];
  if (fs.existsSync(filePath)) {
    try { existing = JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch (_) {}
  }
  existing.push(record);
  if (existing.length > 50) existing = existing.slice(-50);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  log.info(`Explanation recorded for: ${task}`, "EXPLAIN");
  return record;
}

function getRecent(count) {
  const filePath = path.join(DEVOS.logs, "explain.json");
  if (!fs.existsSync(filePath)) return [];
  try {
    const all = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return all.slice(-(count || 5)).reverse();
  } catch (_) { return []; }
}

function getByTask(task) {
  const filePath = path.join(DEVOS.logs, "explain.json");
  if (!fs.existsSync(filePath)) return null;
  try {
    const all = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return all.filter(e => e.task.includes(task)).reverse();
  } catch (_) { return null; }
}

function buildDecisionExplanation(task, decision, context, orchestrationResult) {
  const reasons = [];
  const evidence = [];

  if (decision === "COMMIT") {
    reasons.push("All agents approved the changes");
    reasons.push("No critical security issues detected");
    reasons.push("Review score meets quality threshold");
    evidence.push({ type: "review_score", value: orchestrationResult?.summary?.reviewScore });
    evidence.push({ type: "security_findings", value: orchestrationResult?.summary?.securityFindings });
    evidence.push({ type: "patches_generated", value: orchestrationResult?.summary?.patchesGenerated });
  } else if (decision === "ROLLBACK") {
    reasons.push("Critical issues detected — rolling back");
    evidence.push({ type: "failed_agents", value: orchestrationResult?.agents ? Object.entries(orchestrationResult.agents).filter(([_, a]) => !(a?.review?.approved ?? a?.approved ?? true)).map(([k]) => k) : [] });
  } else {
    reasons.push("Issues require retry with corrected approach");
  }

  const similarSolutions = memory.search.byTask(task);

  return {
    task,
    timestamp: new Date().toISOString(),
    reasoning: reasons,
    confidence: orchestrationResult?.summary?.reviewScore ?? 0.5,
    evidence,
    filesChanged: context?.topFiles?.slice(0, 10).map(f => f.file) || [],
    similarSolutions: similarSolutions.slice(0, 3).map(s => ({
      task: s.task,
      status: s.status,
      confidence: s.confidence,
    })),
    decision,
    summary: buildSummary(task, {
      reasoning: reasons,
      confidence: orchestrationResult?.summary?.reviewScore ?? 0.5,
      evidence,
      decision,
    }),
  };
}

function buildSummary(task, details) {
  const parts = [`Task: ${task}`];
  if (details.reasoning && details.reasoning.length > 0) {
    parts.push(`Reasoning: ${details.reasoning[0]}`);
  }
  if (details.confidence !== undefined) {
    parts.push(`Confidence: ${Math.round(details.confidence * 100)}%`);
  }
  if (details.decision) {
    parts.push(`Decision: ${details.decision}`);
  }
  return parts.join(" | ");
}

function formatForCLI(explanation) {
  if (!explanation) return null;
  return {
    task: explanation.task,
    timestamp: explanation.timestamp,
    reasoning: explanation.reasoning,
    confidence: explanation.confidence,
    evidence: explanation.evidence,
    filesChanged: explanation.filesChanged,
    similarSolutions: explanation.similarSolutions,
    decision: explanation.decision,
    summary: explanation.summary,
  };
}

module.exports = { record, getRecent, getByTask, buildDecisionExplanation, buildSummary, formatForCLI };
