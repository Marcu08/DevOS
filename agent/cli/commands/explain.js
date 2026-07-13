const fs = require("fs");
const path = require("path");
const out = require("../output");
const DEVOS = require("../../config");

function handler() {
  out.banner("Last Execution Report");

  const logsDir = DEVOS.logs;
  const files = {
    "State": "state.json",
    "Context": "context.json",
    "Analysis": "analysis.json",
    "Plan": "reasoning-plan.json",
    "Confidence": "confidence.json",
    "Review": "review.json",
    "Execution": "execution.json",
    "Report": "report.json",
  };

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
      } catch {
        rows.push([label, `${out.colorize("✓", "green")}`, "present"]);
      }
    } else {
      rows.push([label, `${out.colorize("—", "gray")}`, "not found"]);
    }
  }

  out.table(rows);
  out.divider();
  out.info(`${found}/${Object.keys(files).length} log files available`);
  console.log("");
}

module.exports = { handler, description: "Show last execution details and logs" };
