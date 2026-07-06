const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");
const contextModule = require("../context");
const state = require("../state");
const log = require("../logger").get();

function build() {
  log.info("Building project context...", "CTX");
  const ctx = contextModule.buildContext();
  fs.writeFileSync(path.join(DEVOS.logs, "context.json"), JSON.stringify(ctx, null, 2));
  state.update({
    context: {
      totalFiles: ctx.totalFiles,
      topFiles: ctx.topFiles.slice(0, 10).map(f => f.file)
    }
  });
  log.info(`${ctx.totalFiles} files scanned, ${ctx.topFiles.length} ranked`, "CTX");
  return ctx;
}

module.exports = { build };
