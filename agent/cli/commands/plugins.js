const out = require("../output");
const plugins = require("../../../plugins/index");

function handler() {
  out.banner("DevOS Plugins");

  const list = plugins.available();
  if (list.length === 0) {
    out.warn("No plugins found");
  } else {
    const rows = [["NAME", "VERSION", "DESCRIPTION"]];
    for (const p of list) {
      const mod = require(`../../../plugins/${p.name}`);
      rows.push([p.name, p.version, mod.description || ""]);
    }
    out.table(rows);
    out.divider();
    out.info(`${list.length} plugin(s) available`);
  }
  console.log("");
}

module.exports = { handler, description: "List available plugins" };
