const fs = require("fs");
const path = require("path");
const out = require("../output");
const DEVOS = require("../../config");
const explain = require("../../explain/index");

function handler(args) {
  const arg = args[0];

  if (arg && !arg.startsWith("-")) {
    const results = explain.getByTask(arg);
    if (!results || results.length === 0) {
      out.error(`No explanations found for: ${arg}`);
      return;
    }
    out.banner(`Explanations for: ${arg}`);
    for (const exp of results) {
      renderExplanation(exp);
      out.divider();
    }
    return;
  }

  const recent = args.includes("--all") ? explain.getRecent(10) : explain.getRecent(1);

  if (recent.length === 0) {
    const logsDir = DEVOS.logs;
    const files = {
      "State": "state.json", "Context": "context.json", "Analysis": "analysis.json",
      "Plan": "reasoning-plan.json", "Confidence": "confidence.json", "Review": "review.json",
      "Execution": "execution.json", "Report": "report.json",
    };
    out.banner("Last Execution Report");
    let found = 0;
    const rows = [["LOG", "STATUS", "DETAILS"]];
    for (const [label, file] of Object.entries(files)) {
      const fullPath = path.join(logsDir, file);
      if (fs.existsSync(fullPath)) {
        found++;
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          let detail = "";
          if (data.task) detail = (data.task || "").slice(0, 40);
          else if (data.confidence) detail = `confidence: ${Math.round(data.confidence * 100)}%`;
          else if (data.blocked !== undefined) detail = data.blocked ? "BLOCKED" : "OK";
          else if (data.summary) detail = `passed: ${data.summary.passed}, failed: ${data.summary.failed}`;
          else if (data.status) detail = data.status;
          else if (data.machine) detail = data.machine;
          else if (data.steps) detail = `${data.steps.length} steps`;
          rows.push([label, `${out.colorize("✓", "green")}`, detail]);
        } catch { rows.push([label, `${out.colorize("✓", "green")}`, "present"]); }
      } else {
        rows.push([label, `${out.colorize("—", "gray")}`, "not found"]);
      }
    }
    out.table(rows);
    out.divider();
    out.info(`${found}/${Object.keys(files).length} log files available`);
    out.info("Run a task first to generate explanations");

    if (fs.existsSync(path.join(logsDir, "explain.json"))) {
      out.status("info", "ok", "explain.json present but no recent entries");
    }
    return;
  }

  out.banner("Decision Explanations");
  for (const exp of recent) {
    renderExplanation(exp);
    out.divider();
  }
}

function renderExplanation(exp) {
  out.status("info", "ok", out.colorize("Task:", "cyan") + ` ${exp.task}`);
  if (exp.timestamp) out.status("info", "ok", out.colorize("Time:", "cyan") + ` ${new Date(exp.timestamp).toLocaleString()}`);

  if (exp.reasoning && exp.reasoning.length > 0) {
    out.divider();
    out.info(out.colorize("Why changes were made:", "bold"));
    for (const r of exp.reasoning) out.status("ok", "ok", r);
  }

  if (exp.confidence !== undefined) {
    const pct = Math.round(exp.confidence * 100);
    const color = pct >= 80 ? "green" : pct >= 50 ? "yellow" : "red";
    out.divider();
    out.info(out.colorize("Confidence Score:", "bold") + ` ${out.colorize(`${pct}%`, color)}`);
  }

  if (exp.evidence && exp.evidence.length > 0) {
    out.divider();
    out.info(out.colorize("Evidence:", "bold"));
    for (const ev of exp.evidence) {
      const val = Array.isArray(ev.value) ? ev.value.join(", ") : ev.value;
      out.status("info", "ok", `${ev.type}: ${val}`);
    }
  }

  if (exp.filesChanged && exp.filesChanged.length > 0) {
    out.divider();
    out.info(out.colorize("Files Changed:", "bold"));
    for (const f of exp.filesChanged.slice(0, 10)) out.status("arrow", "arrow", f);
  }

  if (exp.similarSolutions && exp.similarSolutions.length > 0) {
    out.divider();
    out.info(out.colorize("Previous Similar Solutions:", "bold"));
    for (const s of exp.similarSolutions) {
      out.status("info", "ok", `${s.task || "?"} — ${s.status} (confidence: ${Math.round((s.confidence || 0) * 100)}%)`);
    }
  }

  if (exp.decision) {
    const decColor = exp.decision === "COMMIT" ? "green" : exp.decision === "ROLLBACK" ? "red" : "yellow";
    out.divider();
    out.info(out.colorize("Decision:", "bold") + ` ${out.colorize(exp.decision, decColor)}`);
  }

  if (exp.summary) {
    out.divider();
    out.status("info", "ok", exp.summary.slice(0, 120));
  }
}

module.exports = { handler, description: "Explain decisions with reasoning, confidence, and evidence" };
