const out = require("../output");
const perf = require("../../performance/index");

function handler() {
  out.banner("Performance Metrics");
  const stats = perf.getStats();

  out.status("info", "ok", `Total runs: ${stats.totalRuns}`);
  out.status("info", "ok", `Total time: ${stats.totalTime}`);
  out.status("info", "ok", `Avg time/run: ${stats.avgTimePerRun}`);
  out.status("info", "ok", `Cache efficiency: ${out.colorize(stats.cacheEfficiency, stats.cacheEfficiency !== "N/A" && parseFloat(stats.cacheEfficiency) > 50 ? "green" : "yellow")}`);
  out.status("info", "ok", `Cache hits: ${stats.cacheHits} / misses: ${stats.cacheMisses}`);

  if (stats.agents.length > 0) {
    out.divider();
    out.info("Agent Performance:");
    const rows = [["AGENT", "RUNS", "AVG TIME", "TOTAL"]];
    for (const a of stats.agents) rows.push([a.name, String(a.runs), a.avgTime, a.totalTime]);
    out.table(rows);
  }

  if (stats.recentRuns.length > 0) {
    out.divider();
    out.info("Recent Runs:");
    const rows = [["TASK", "DURATION", "STATUS", "AGENTS"]];
    for (const r of stats.recentRuns) rows.push([r.task, r.duration, r.status, String(r.agents)]);
    out.table(rows);
  }
}

module.exports = { handler, description: "Show performance metrics (execution time, cache, agent duration)" };
