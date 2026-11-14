const out = require("../output");
const DEVOS = require("../../config");

function handler() {
  const approval = require("../../approval/index");
  out.banner("DevOS Configuration");
  const cfg = DEVOS.config;
  const rows = [
    ["Version", cfg.version],
    ["Name", cfg.name],
    ["Root", DEVOS.root],
    ["Workspace", DEVOS.workspace],
    ["Editor", cfg.editor || "-"],
    ["AI Provider", cfg.ai?.provider || "none"],
    ["Execution Mode", approval.current()],
  ];
  out.table(rows);
  console.log("");
  out.info("Validator:");
  if (cfg.validator) {
    for (const [k, v] of Object.entries(cfg.validator)) {
      out.status(k, v ? "ok" : "skip");
    }
  }
  console.log("");
  out.info(`Confidence threshold: ${cfg.reasoning?.confidenceThreshold || 0.6}`);
  out.info(`Max healing retries: ${cfg.reasoning?.maxHealingRetries || 3}`);
  console.log("");
}

module.exports = { handler, description: "Show the current DevOS configuration" };
