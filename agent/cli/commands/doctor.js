const out = require("../output");

function handler() {
  out.banner("Environment Health Check");

  const result = require("../../tools").run("doctor");

  if (result && result.checks) {
    for (const c of result.checks) {
      if (c.status === "ok") {
        out.status(c.name, "ok", c.version || "available");
      } else {
        out.status(c.name, "fail", "missing");
      }
    }
  }

  out.divider();
  if (result && result.ok) {
    out.success("All checks passed");
  } else {
    out.error("Some checks failed");
  }
  console.log("");
}

module.exports = { handler, description: "Run environment health checks" };
