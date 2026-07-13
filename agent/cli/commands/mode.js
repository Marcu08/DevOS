const out = require("../output");
const approval = require("../../approval/index");

function handler(args) {
  const sub = args[0];

  if (!sub || sub === "status") {
    const mode = approval.current();
    const cfg = approval.getModeConfig();
    out.banner("Execution Mode");
    out.status("info", "ok", `Current: ${out.colorize(mode, "cyan")} (${cfg.label})`);
    out.status("info", "ok", `Requires approval: ${cfg.requiresApproval.length > 0 ? cfg.requiresApproval.join(", ") : "none"}`);
    out.status("info", "ok", `Parallel agents: ${cfg.parallel ? "yes" : "no"}`);
    out.divider();
    out.info("Available modes:");
    for (const m of approval.modes) {
      const active = m.name === mode ? out.colorize(" ← active", "green") : "";
      out.status("arrow", "arrow", `${m.name}: ${m.label}${active}`);
    }
    return;
  }

  const result = approval.setMode(sub);
  if (result.error) {
    out.error(result.message);
    return;
  }
  out.success(result.message);

  const cfg = approval.getModeConfig();
  if (cfg.requiresApproval.length > 0) {
    out.warn(`Approval required for: ${cfg.requiresApproval.join(", ")}`);
  } else {
    out.info("No approval gates — fully autonomous");
  }
}

module.exports = { handler, description: "Set or view execution mode (autonomous, assisted, safe)" };
