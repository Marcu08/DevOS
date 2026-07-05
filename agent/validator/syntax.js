const { execSync } = require("child_process");
const path = require("path");
const DEVOS = require("../config");

function run(context) {
  const start = Date.now();
  const files = context.modifiedFiles || [];

  const jsFiles = files.filter(f => f.endsWith(".js") || f.endsWith(".mjs") || f.endsWith(".cjs"));

  if (jsFiles.length === 0) {
    return { name: "syntax", status: "skipped", time: Date.now() - start, error: null };
  }

  const errors = [];

  for (const file of jsFiles) {
    const fullPath = path.join(DEVOS.workspace, file);
    try {
      execSync(`node --check "${fullPath}"`, { encoding: "utf-8", stdio: "pipe" });
    } catch (e) {
      errors.push(`${file}: ${e.stderr?.slice(0, 200) || e.message}`);
    }
  }

  return {
    name: "syntax",
    status: errors.length === 0 ? "passed" : "failed",
    time: Date.now() - start,
    error: errors.length > 0 ? errors.join("; ") : null,
    filesChecked: jsFiles.length,
  };
}

module.exports = { run };
