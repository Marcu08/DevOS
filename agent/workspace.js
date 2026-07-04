const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const config = require("./config");

const ROOT = config.get("root");
const WORKSPACE = path.join(ROOT, "workspace");

function git(cmd, cwd = WORKSPACE) {
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
  const skip = [WORKSPACE, path.join(ROOT, ".git"), path.join(ROOT, "node_modules"), path.join(ROOT, "backup"), path.join(ROOT, "backups")];

  if (fs.existsSync(path.join(WORKSPACE, ".git"))) {
    try { git("checkout main 2>nul || git checkout master 2>nul"); } catch {}
    try { git("reset --hard HEAD"); } catch {}
    try { git("clean -fd"); } catch {}
    return;
  }

  fs.rmSync(WORKSPACE, { recursive: true, force: true });
  fs.mkdirSync(WORKSPACE, { recursive: true });

  const files = getFiles(ROOT, 30);

  for (const f of files) {
    if (skip.some(s => f.startsWith(s))) continue;
    const rel = f.replace(ROOT, "");
    const dest = path.join(WORKSPACE, rel);
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

module.exports = { prepareWorkspace, createAgentBranch, snapshot, rollback, git, WORKSPACE, ROOT };
