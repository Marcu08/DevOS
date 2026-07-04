const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { applyUnifiedDiff } = require("./utils/diff");
const config = require("./config");
const workspace = require("./workspace");

const BACKUP = path.join(config.get("root"), "backup", "workspace");

function backupFile(filePath) {
  const src = path.join(workspace.WORKSPACE, filePath);
  const dest = path.join(BACKUP, filePath);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function applyPatch(filePath, diff) {
  const full = path.join(workspace.WORKSPACE, filePath);
  let content = "";
  try { content = fs.readFileSync(full, "utf-8"); } catch {}
  backupFile(filePath);
  const patched = applyUnifiedDiff(content, diff);
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
    execSync("node index.js", { cwd: workspace.WORKSPACE, stdio: "ignore" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function validatePR(pr) {
  if (!pr?.files?.length) return false;
  return pr.files.every(f => f.path && f.patch && f.reason);
}

function selfHeal(taskName, pr, state, maxRetries = 3) {
  let current = pr;
  const branch = workspace.createAgentBranch(taskName);
  workspace.snapshot(taskName);

  for (let i = 0; i < maxRetries; i++) {
    console.log(`[LOOP] Attempt ${i + 1}`);
    applyPatches(current);
    const check = runChecks();

    if (check.ok) {
      console.log("[LOOP] SUCCESS");
      return { pr: current, branch };
    }

    console.log("[LOOP] FAILED → rollback");
    state.update({ lastError: check.error?.slice(0, 200), status: "retrying" });
    workspace.rollback();

    current = {
      ...current,
      files: current.files.map(f => ({
        ...f,
        patch: f.patch + `\n// retry ${i + 1}\n// error: ${check.error?.slice(0, 120)}`
      }))
    };
  }

  return null;
}

module.exports = { backupFile, applyPatch, applyPatches, runChecks, validatePR, selfHeal };
