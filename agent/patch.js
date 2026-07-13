const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { applyDiff } = require("./patch-engine");
const DEVOS = require("./config");

function backupFile(filePath) {
  const src = path.join(DEVOS.workspace, filePath);
  const dest = path.join(DEVOS.backup, filePath);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function applyPatch(filePath, diff) {
  const full = path.join(DEVOS.workspace, filePath);
  let content = "";
  try { content = fs.readFileSync(full, "utf-8"); } catch {}
  backupFile(filePath);
  const patched = applyDiff(content, diff);
  fs.writeFileSync(full, patched);
}

function applyPatches(pr) {
  for (const file of pr.files) {
    console.log(`[PATCH] ${file.path}`);
    try { applyPatch(file.path, file.patch); } catch (e) { console.log(`[ERROR] ${file.path}`); }
  }
}

function runChecks() {
  try {
    execSync("node index.js", { cwd: DEVOS.workspace, stdio: "ignore" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function validatePR(pr) {
  if (!pr?.files?.length) return false;
  return pr.files.every(f => f.path && f.patch && f.reason);
}

module.exports = { backupFile, applyPatch, applyPatches, runChecks, validatePR };
