const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");
const contextModule = require("../context");
const plugins = require("../../plugins/index");
const state = require("../state");
const log = require("../logger").get();

function build() {
  log.info("Building project context...", "CTX");
  const ctx = contextModule.buildContext();
  fs.writeFileSync(path.join(DEVOS.logs, "context.json"), JSON.stringify(ctx, null, 2));

  const activePlugins = plugins.detectPlugins(ctx);
  if (activePlugins.length > 0) {
    log.info(`Detected plugins: ${activePlugins.map(p => p.plugin.name).join(", ")}`, "CTX");
    ctx.activePlugins = activePlugins.map(p => p.plugin.name);
    ctx.enabledTools = plugins.getEnabledTools(ctx);
    ctx.projectRules = plugins.getProjectRules(ctx);
  }

  state.update({
    context: {
      totalFiles: ctx.totalFiles,
      topFiles: ctx.topFiles.slice(0, 10).map(f => f.file),
      plugins: ctx.activePlugins || [],
    }
  });
  log.info(`${ctx.totalFiles} files scanned, ${ctx.topFiles.length} ranked`, "CTX");
  return ctx;
}

module.exports = { build };
