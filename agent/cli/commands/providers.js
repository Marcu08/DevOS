const out = require("../output");

function handler() {
  const providers = require("../../../providers/index");

  out.banner("AI Providers");
  const rows = [["PROVIDER", "STATUS"]];
  for (const provider of providers.available()) {
    rows.push([provider.name, provider.available ? "available" : "not configured"]);
  }
  out.table(rows);
  out.divider();
  out.info("Standalone provider API: require('./providers').generate/analyze/review");
  out.info("The default pipeline uses agent/ai: opencode → direct → fallback.");
}

module.exports = { handler, description: "List standalone AI providers and availability" };
