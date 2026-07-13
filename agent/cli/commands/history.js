const out = require("../output");
const history = require("../../memory/history");

function handler() {
  out.banner("Execution History");

  const stats = history.stats();
  out.info(`${out.colorize("Total runs:", "bold")}  ${stats.total}`);
  out.info(`${out.colorize("Success:", "green")}    ${stats.succeeded}`);
  out.info(`${out.colorize("Failed:", "red")}     ${stats.failed}`);
  out.info(`${out.colorize("Rate:", "bold")}      ${stats.rate}`);
  console.log("");

  const recent = history.recent(10);
  if (recent.length === 0) {
    out.warn("No runs recorded yet");
  } else {
    const rows = [["ID", "TASK", "STATUS", "CONFIDENCE", "FILES"]];
    for (const r of recent) {
      const st = r.status === "completed" ? `${out.colorize("completed", "green")}` : `${out.colorize("failed", "red")}`;
      const conf = r.confidence ? `${Math.round(r.confidence * 100)}%` : "-";
      rows.push([`#${r.id}`, (r.task || "").slice(0, 40), st, conf, `${r.filesChanged || 0}`]);
    }
    out.table(rows);
    out.divider();
    out.info(`Showing last ${Math.min(recent.length, 10)} runs`);
  }
  console.log("");
}

module.exports = { handler, description: "Show execution history" };
