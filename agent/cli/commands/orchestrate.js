const out = require("../output");
const pipeline = require("../../pipeline/index");

async function handler(args) {
  const task = args.join(" ") || "Review codebase";
  out.banner("Multi-Agent Orchestration");
  out.info(`Task: ${task}`);
  out.info("Agents available:");
  const agents = pipeline.agents();
  for (const a of agents) {
    out.status("info", "ok", `${a.name} v${a.version}`);
  }
  out.divider();
  const result = await pipeline.orchestrate(task);
  out.divider();
  if (result.success) {
    out.success("Orchestration completed successfully");
  } else {
    out.error("Orchestration completed with issues");
  }
  out.info(`Decision: ${result.result.decision}`);
  out.info(`Patches: ${result.result.patchesGenerated}`);
  out.info(`Review Score: ${result.result.reviewScore}`);
  out.info(`Security Findings: ${result.result.securityFindings}`);
  out.info(`Risk: ${result.result.plannerRisk}`);
}

module.exports = { handler, description: "Run multi-agent orchestration pipeline" };
