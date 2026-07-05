const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

function build(results) {
  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;
  const skipped = results.filter(r => r.status === "skipped").length;

  const report = {
    success: failed === 0,
    started: results[0]?.timestamp || new Date().toISOString(),
    ended: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
      skipped,
    },
    validators: results.map(r => ({
      name: r.name,
      status: r.status,
      time: r.time,
      error: r.error || null,
      data: r.data || null,
    })),
  };

  fs.mkdirSync(DEVOS.logs, { recursive: true });
  fs.writeFileSync(path.join(DEVOS.logs, "report.json"), JSON.stringify(report, null, 2));

  return report;
}

module.exports = { build };
