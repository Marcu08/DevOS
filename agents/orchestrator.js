const state = require("../agent/state");
const memory = require("../agent/memory/index");
const workspace = require("../agent/workspace");
const log = require("../agent/logger").get();

const agents = {};
let loaded = false;

function loadAgents() {
  if (loaded) return;
  const fs = require("fs");
  const path = require("path");
  const dir = __dirname;
  const files = fs.readdirSync(dir).filter(f => f.endsWith("-agent.js"));
  for (const file of files) {
    try {
      const mod = require(path.join(dir, file));
      if (mod.name) {
        agents[mod.name] = mod;
        log.info(`Loaded agent: ${mod.name} v${mod.version}`, "ORCH");
      }
    } catch (e) {
      log.warn(`Failed to load agent ${file}: ${e.message}`, "ORCH");
    }
  }
  loaded = true;
}

function available() {
  loadAgents();
  return Object.keys(agents).map(k => ({ name: agents[k].name, version: agents[k].version }));
}

async function orchestrate(task, context) {
  loadAgents();
  log.info("=== ORCHESTRATOR START ===", "ORCH");

  const results = { task, agents: {}, decision: null, summary: {} };

  // Step 1: Planner Agent
  log.info("[ORCH] Assigning to planner-agent", "ORCH");
  const plannerAnalysis = agents["planner-agent"].analyze(context, task);
  const plan = agents["planner-agent"].execute(context, plannerAnalysis);
  results.agents.planner = { analysis: plannerAnalysis, plan };
  state.update({ plan });
  log.info(`[ORCH] Plan: ${plan.priority} priority, ${plan.risk} risk, ${plan.steps.length} steps`, "ORCH");

  if (!plannerAnalysis.warnings) plannerAnalysis.warnings = [];
  for (const w of plannerAnalysis.warnings) log.warn(`[PLANNER] ${w}`, "ORCH");
  for (const s of (plannerAnalysis.recommendations || [])) log.info(`[PLANNER] ${s}`, "ORCH");

  // Step 2: Coder Agent
  log.info("[ORCH] Assigning to coder-agent", "ORCH");
  const coderAnalysis = agents["coder-agent"].analyze(context, task);
  const coderResult = agents["coder-agent"].execute(context, { ...coderAnalysis, task });
  results.agents.coder = { analysis: coderAnalysis, result: coderResult };
  log.info(`[ORCH] Generated ${coderResult.patchCount} patch(es)`, "ORCH");

  // Step 3: Reviewer Agent
  log.info("[ORCH] Assigning to reviewer-agent", "ORCH");
  const reviewerResult = agents["reviewer-agent"].review(context, null, coderResult);
  results.agents.reviewer = reviewerResult;
  log.info(`[ORCH] Review: ${reviewerResult.approved ? "PASS" : "FAIL"}, score=${reviewerResult.score}`, "ORCH");

  // Step 4: Security Agent
  log.info("[ORCH] Assigning to security-agent", "ORCH");
  const securityAnalysis = agents["security-agent"].analyze(context, task);
  const securityResult = agents["security-agent"].execute(context, securityAnalysis);
  results.agents.security = { analysis: securityAnalysis, result: securityResult };
  const securityReview = agents["security-agent"].review(securityResult);
  results.agents.security.review = securityReview;
  log.info(`[ORCH] Security: ${securityReview.approved ? "PASS" : "FAIL"} — ${securityReview.summary}`, "ORCH");

  // Decision Engine
  const allApproved = reviewerResult.approved && securityReview.approved;
  const hasCriticalIssues = securityResult.criticalCount > 0;

  let decision;
  if (hasCriticalIssues) {
    decision = "ROLLBACK";
  } else if (allApproved && coderResult.patchCount > 0) {
    decision = "COMMIT";
  } else if (reviewerResult.issues.length > 0 && coderResult.patchCount === 0) {
    decision = "ROLLBACK";
  } else {
    decision = "RETRY";
  }

  results.decision = decision;
  results.summary = {
    task,
    patchesGenerated: coderResult.patchCount,
    reviewScore: reviewerResult.score,
    securityFindings: securityResult.totalFindings,
    decision,
    plannerPriority: plan.priority,
    plannerRisk: plan.risk,
  };

  log.info(`[ORCH] Decision: ${decision}`, "ORCH");
  log.info("=== ORCHESTRATOR END ===", "ORCH");

  return results;
}

function createDecisionReport(orchestrationResult) {
  const r = orchestrationResult;
  return {
    task: r.task,
    decision: r.decision,
    agents: Object.keys(r.agents).map(name => ({
      name,
      approved: r.agents[name]?.review?.approved ?? r.agents[name]?.approved ?? true,
      issues: r.agents[name]?.review?.issues || r.agents[name]?.issues || [],
    })),
    patchesGenerated: r.summary.patchesGenerated,
    reviewScore: r.summary.reviewScore,
    securityFindings: r.summary.securityFindings,
    plannerPriority: r.summary.plannerPriority,
    plannerRisk: r.summary.plannerRisk,
  };
}

module.exports = { orchestrate, createDecisionReport, available };
