const out = require("../output");
const memory = require("../../memory/index");

function handler(args) {
  const sub = args[0];

  if (sub === "search") {
    const query = args.slice(1).join(" ");
    if (!query) { out.error("Usage: node cli.js memory search <query>"); return; }
    out.banner(`Knowledge Search: ${query}`);
    const results = memory.knowledge.search(query);
    if (results.length === 0) {
      out.warn("No knowledge entries found");
      return;
    }
    const rows = [["ID", "PROBLEM", "SOLUTION", "CONFIDENCE", "USES"]];
    for (const r of results) {
      const conf = `${(r.confidence * 100).toFixed(0)}%`;
      rows.push([String(r.id), r.problem.slice(0, 30), r.solution.slice(0, 30), conf, String(r.count)]);
    }
    out.table(rows);
    out.divider();
    out.info(`${results.length} result(s) found`);
    return;
  }

  if (sub === "explain") {
    const id = parseInt(args[1], 10);
    if (!id) { out.error("Usage: node cli.js memory explain <entry-id>"); return; }
    const exp = memory.graph.explain(id);
    if (!exp) { out.error(`Entry #${id} not found`); return; }
    out.banner(`Knowledge Entry #${id}`);
    out.status("info", "ok", `Problem: ${exp.entry.problem}`);
    out.status("info", "ok", `Solution: ${exp.entry.solution}`);
    out.status("info", "ok", `Success Rate: ${(exp.entry.successRate * 100).toFixed(0)}%`);
    out.status("info", "ok", `Uses: ${exp.entry.count}`);
    out.status("info", "ok", `Agent: ${exp.entry.agent}`);
    out.status("info", "ok", `Files: ${(exp.entry.files || []).join(", ") || "none"}`);
    if (exp.relatedEntries.length > 0) {
      out.divider();
      out.info("Related Entries:");
      for (const r of exp.relatedEntries) {
        out.status("arrow", "arrow", `#${r.id}: ${r.problem.slice(0, 50)}`);
      }
    }
    return;
  }

  // Default: show memory stats
  out.banner("Memory Statistics");
  const stats = memory.getStats();

  out.status("info", "ok", `History: ${stats.history.total} runs (${stats.history.succeeded} succeeded, ${stats.history.failed} failed)`);
  out.status("info", "ok", `Success rate: ${stats.history.rate}`);
  out.divider();

  out.info("Knowledge Graph:");
  out.status("info", "ok", `Entries: ${stats.knowledge.total}`);
  out.status("info", "ok", `Relationships: ${stats.knowledge.relationships}`);
  out.status("info", "ok", `Avg success rate: ${stats.knowledge.avgSuccessRate}`);
  out.status("info", "ok", `Total uses: ${stats.knowledge.totalUses}`);
  if (stats.knowledge.topAgents.length > 0) {
    out.divider();
    out.info("Top Agents:");
    for (const a of stats.knowledge.topAgents) {
      const [name, count] = Object.entries(a)[0];
      out.status("ok", "ok", `${name}: ${count}`);
    }
  }

  const recent = memory.history.recent(3);
  if (recent.length > 0) {
    out.divider();
    out.info("Recent Runs:");
    for (const r of recent) {
      const statusColor = r.status === "completed" ? "green" : "red";
      out.status(r.status === "completed" ? "ok" : "fail", r.status === "completed" ? "ok" : "fail", `${out.colorize(r.status, statusColor)} — ${(r.task || "").slice(0, 50)}`);
    }
  }

  out.divider();
  out.info("Subcommands: search <query>, stats, explain <id>");
}

module.exports = { handler, description: "Show memory, knowledge graph, and error statistics" };
