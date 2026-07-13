const out = require("../output");
const plugins = require("../../../plugins/index");

function handler(args) {
  const sub = args[0];

  if (sub === "install") {
    const name = args[1];
    if (!name) { out.error("Usage: node cli.js plugins install <name>"); return; }
    out.banner(`Installing Plugin: ${name}`);
    const result = plugins.install(name);
    if (result.error) {
      out.error(result.message);
      const search = plugins.searchMarketplace(name);
      if (search.length > 0) {
        out.info("Did you mean one of these?");
        for (const s of search) out.status("info", "ok", `${s.name} — ${s.description}`);
      }
    } else {
      out.success(result.message);
    }
    return;
  }

  if (sub === "uninstall") {
    const name = args[1];
    if (!name) { out.error("Usage: node cli.js plugins uninstall <name>"); return; }
    const result = plugins.uninstall(name);
    if (result.error) out.error(result.message);
    else out.success(result.message);
    return;
  }

  if (sub === "search") {
    const query = args.slice(1).join(" ");
    if (!query) { out.error("Usage: node cli.js plugins search <query>"); return; }
    out.banner(`Search Marketplace: ${query}`);
    const results = plugins.searchMarketplace(query);
    if (results.length === 0) {
      out.warn("No matching plugins found");
    } else {
      const rows = [["NAME", "VERSION", "DESCRIPTION"]];
      for (const p of results) rows.push([p.name, p.version, p.description || ""]);
      out.table(rows);
      out.divider();
      out.info(`${results.length} plugin(s) found`);
    }
    return;
  }

  if (sub === "info") {
    const name = args[1];
    if (!name) { out.error("Usage: node cli.js plugins info <name>"); return; }
    const manifest = plugins.getManifest(name);
    if (!manifest) { out.error(`Plugin '${name}' not found`); return; }
    out.banner(`Plugin: ${manifest.name} v${manifest.version}`);
    out.status("info", "ok", manifest.description);
    out.divider();
    out.info("Capabilities:");
    for (const cap of manifest.capabilities) out.status("ok", "ok", cap);
    out.divider();
    out.info("Validators/Rules:");
    for (const rule of manifest.validators) out.status("info", "ok", rule);
    out.divider();
    out.info("Detection rules:");
    for (const d of manifest.detect) out.status("arrow", "arrow", `${d}`);
    return;
  }

  // Default: list
  out.banner("DevOS Plugins");
  const list = plugins.available();
  if (list.length === 0) {
    out.warn("No plugins found");
  } else {
    const rows = [["NAME", "VERSION", "DESCRIPTION"]];
    for (const p of list) {
      const manifest = plugins.getManifest(p.name);
      rows.push([p.name, p.version, manifest?.description || ""]);
    }
    out.table(rows);
    out.divider();
    out.info(`${list.length} plugin(s) available`);
    out.divider();
    out.info("Subcommands: install <name>, uninstall <name>, search <query>, info <name>");
  }
}

module.exports = { handler, description: "List, install, and manage plugins" };
