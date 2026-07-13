const out = require("../output");
const sandbox = require("../../sandbox/index");

function handler(args) {
  const sub = args[0];

  if (sub === "create") {
    out.banner("Creating Sandbox");
    const result = sandbox.create();
    out.success(`Sandbox created with ${result.sandboxFiles} files`);
    out.status("info", "ok", `State: ${result.state}`);
    return;
  }

  if (sub === "status") {
    out.banner("Sandbox Status");
    const s = sandbox.status();
    if (s.state === "not_created") {
      out.warn("Sandbox not yet created");
      out.info("Run: node cli.js sandbox create");
      return;
    }
    out.status("info", "ok", `State: ${out.colorize(s.state, s.state === "merged" ? "green" : "cyan")}`);
    out.status("info", "ok", `Created: ${s.created || "—"}`);
    out.status("info", "ok", `Original files: ${s.originalFiles}`);
    out.status("info", "ok", `Sandbox files: ${s.sandboxFiles}`);
    out.status("info", "ok", `Changes: ${(s.changes || []).length}`);
    if (s.validation) {
      out.status(s.validation.passed ? "ok" : "fail", s.validation.passed ? "ok" : "fail", `Validation: ${s.validation.passed ? "PASSED" : "FAILED"}`);
    }
    if (s.changes && s.changes.length > 0) {
      out.divider();
      out.info("Changes:");
      for (const c of s.changes) out.status("arrow", "arrow", `${c.type}: ${c.file}`);
    }
    return;
  }

  if (sub === "clean") {
    out.banner("Cleaning Sandbox");
    const result = sandbox.clean();
    out.success("Sandbox cleaned");
    return;
  }

  if (sub === "compare") {
    out.banner("Sandbox Comparison");
    const result = sandbox.compare();
    if (result.error) { out.error(result.error); return; }
    out.status("info", "ok", `Total changes: ${result.totalChanges}`);
    out.status("info", "ok", `State: ${result.state}`);
    for (const d of result.diffs) {
      const icon = d.type === "added" ? "ok" : d.type === "deleted" ? "fail" : "arrow";
      out.status(icon, icon, `${d.type}: ${d.file}`);
    }
    return;
  }

  out.banner("Sandbox Commands");
  out.info("Subcommands:");
  out.status("arrow", "arrow", "create — Create isolated sandbox copy");
  out.status("arrow", "arrow", "status — Show sandbox state and changes");
  out.status("arrow", "arrow", "clean  — Remove sandbox directory");
  out.status("arrow", "arrow", "compare — Compare original vs sandbox");
}

module.exports = { handler, description: "Isolated sandbox execution environment" };
