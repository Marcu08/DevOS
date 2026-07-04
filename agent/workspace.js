const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const DEVOS = require("./config");

function git(cmd, cwd = DEVOS.workspace) {
  return execSync(`git ${cmd}`, { encoding: "utf-8", cwd });
}

function getFiles(dir, max = 15) {
  let results = [];
  function walk(d) {
    if (results.length >= max) return;
    const entries = fs.readdirSync(d);
    for (const e of entries) {
      const full = path.join(d, e);
      if (full.includes("node_modules") || full.includes(".git")) continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else {
        results.push(full);
      }
      if (results.length >= max) return;
    }
  }
  walk(dir);
  return results;
}

function prepareWorkspace() {
  const skip = [DEVOS.workspace, path.join(DEVOS.root, ".git"), path.join(DEVOS.root, "node_modules"), path.join(DEVOS.root, "backup"), path.join(DEVOS.root, "backups")];

  if (fs.existsSync(path.join(DEVOS.workspace, ".git"))) {
    try { git("checkout main 2>nul || git checkout master 2>nul"); } catch {}
    try { git("reset --hard HEAD"); } catch {}
    try { git("clean -fd"); } catch {}
    return;
  }

  fs.rmSync(DEVOS.workspace, { recursive: true, force: true });
  fs.mkdirSync(DEVOS.workspace, { recursive: true });

  const files = getFiles(DEVOS.root, 30);

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
