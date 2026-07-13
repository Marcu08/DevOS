const out = require("../output");
const mem = require("../../memory/index");
const mistakes = require("../../memory/mistakes");

function handler() {
  out.banner("Memory Overview");

  const stats = mem.getStats();

  out.info(`${out.colorize("History:", "bold")}         ${stats.history.total} runs (${stats.history.rate} success)`);
  out.info(`${out.colorize("Recent mistakes:", "bold")}  ${stats.recentMistakes.length}`);
  out.info(`${out.colorize("Recent runs:", "bold")}      ${stats.recentRuns.length}`);
  console.log("");

  if (stats.recentMistakes.length > 0) {
    out.info("Recent mistakes:");
    for (const m of stats.recentMistakes) {
      out.warn(`  ${(m.error || "").slice(0, 80)}`);
    }
    console.log("");
  }

  const allMistakes = mistakes.recentErrors(50);
  const byStage = {};
  for (const m of allMistakes) {
    byStage[m.stage] = (byStage[m.stage] || 0) + 1;
  }
  const stages = Object.keys(byStage);
  if (stages.length > 0) {
    out.info("Errors by stage:");
    for (const s of stages) {
      out.status(s, byStage[s] > 5 ? "fail" : "ok", `${byStage[s]} errors`);
    }
    console.log("");
  }

  out.info(`Run \`${out.colorize("node cli.js history", "cyan")}\` for detailed run history`);
  console.log("");
}

module.exports = { handler, description: "Show memory and error statistics" };
