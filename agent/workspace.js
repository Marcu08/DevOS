const fs = require("fs");
const path = require("path");
const DEVOS = require("./config");
const { git } = require("./util/git");
const { getFiles } = require("./util/scanner");

function prepareWorkspace() {
  const skip = [DEVOS.workspace, path.join(DEVOS.root, ".git"), path.join(DEVOS.root, "node_modules"), path.join(DEVOS.root, "backup"), path.join(DEVOS.root, "backups"), path.join(DEVOS.root, "logs"), path.join(DEVOS.root, "sandbox")];

  // Rebuild the working copy from the current project files. Reusing an
  // existing workspace would let stale files from a previous run leak into the
  // next one.
  fs.rmSync(DEVOS.workspace, { recursive: true, force: true });
  fs.mkdirSync(DEVOS.workspace, { recursive: true });

  // Match the context scanner's file budget so files the AI can target are
  // actually present in the workspace.
  const files = getFiles(DEVOS.root, 200);

  for (const f of files) {
    if (skip.some(s => f.startsWith(s))) continue;
    const rel = f.replace(DEVOS.root, "");
    const dest = path.join(DEVOS.workspace, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f, dest);
  }

  git("init");
  git("add .");
  git('commit -m "init workspace" --allow-empty');
}

function createAgentBranch(taskName) {
  const safe = taskName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 30).replace(/-$/, "");
  const branch = `agent/${safe || "run"}-${Date.now()}`;
  git(`checkout -b ${branch}`);
  return branch;
}

function snapshot(taskName) {
  git("add .");
  try { git(`commit -m "snapshot before agent: ${taskName}" --allow-empty`); } catch {}
}

function rollback() {
  try { git("reset --hard"); } catch {}
  try { git("clean -fd"); } catch {}
}

module.exports = { prepareWorkspace, createAgentBranch, snapshot, rollback, git, WORKSPACE: DEVOS.workspace, ROOT: DEVOS.root };
