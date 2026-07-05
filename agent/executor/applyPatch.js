const patch = require("../patch");

function run(step, context) {
  const pr = context.pr;
  if (!pr?.files?.length) {
    return { ok: false, error: "No files to patch" };
  }

  for (const file of pr.files) {
    console.log(`[PATCH] ${file.path}`);
    try {
      patch.applyPatch(file.path, file.patch);
    } catch (e) {
      return { ok: false, error: `Failed to patch ${file.path}: ${e.message}` };
    }
  }

  return { ok: true };
}

module.exports = { run };
