const out = require("../output");

function handler() {
  out.banner("Workspace Validation");

  const names = ["syntax", "git", "node", "lint"];
  for (const n of names) out.status(n, "running");
  console.log("");

  const report = require("../../validator/index").validate({ modifiedFiles: [] });

  for (const v of report.validators || []) {
    const st = v.status === "passed" ? "ok" : v.status === "failed" ? "fail" : "skip";
    const detail = v.status === "passed" ? `${v.time || ""}` : v.error || "";
    out.status(v.name, st, detail);
  }

  out.divider();
  out.info(`${out.colorize("Passed:", "green")}  ${report.summary.passed}`);
  out.info(`${out.colorize("Failed:", "red")}   ${report.summary.failed}`);
  out.info(`${out.colorize("Skipped:", "gray")} ${report.summary.skipped}`);
  console.log("");
}

module.exports = { handler, description: "Run all validators on the current workspace" };
