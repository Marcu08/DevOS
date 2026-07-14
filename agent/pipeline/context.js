const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");
const contextModule = require("../context");
const pm = require("../../plugins/manager");
const state = require("../state");
const log = require("../logger").get();

async function build() {
  log.info("Building project context...", "CTX");
  const ctx = contextModule.buildContext();
  fs.writeFileSync(path.join(DEVOS.logs, "context.json"), JSON.stringify(ctx, null, 2));

  const pluginManager = pm.getInstance();
  const activePlugins = pluginManager.detect(ctx);
  if (activePlugins.length > 0) {
    log.info(`Detected plugins: ${activePlugins.map(p => p.descriptor.name).join(", ")}`, "CTX");
    ctx.activePlugins = activePlugins.map(p => p.descriptor.name);
    ctx.enabledTools = pluginManager.getEnabledTools(ctx);
    ctx.projectRules = pluginManager.getProjectRules(ctx);

    const enriched = await pluginManager.runContextAugmenters(ctx);
    if (enriched) Object.assign(ctx, enriched);

    const injections = await pluginManager.collectPromptInjections(ctx);
    if (injections.length > 0) {
      ctx._pluginPromptInjections = injections;
      log.info(`Collected ${injections.length} prompt injection(s) from plugins`, "CTX");
    }
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