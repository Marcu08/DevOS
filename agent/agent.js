const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { applyUnifiedDiff } = require("./utils/diff");
const { buildContext } = require("./context");

const ROOT = "C:\\DevOs";
const WORKSPACE = path.join(ROOT, "workspace");
const LOGS = path.join(ROOT, "logs");
const BACKUP = path.join(ROOT, "backup", "workspace");

const task = process.argv[2] || "analyze project";

let agentState = { task, status: "started", branch: null, lastError: null };

function writeState() {
  agentState.timestamp = new Date().toISOString();
  fs.writeFileSync(path.join(LOGS, "state.json"), JSON.stringify(agentState, null, 2));
}

function run(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, { encoding: "utf-8", cwd, stdio: ["pipe", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

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
  if (!fs.existsSync(path.join(WORKSPACE, ".git"))) {
    fs.rmSync(WORKSPACE, { recursive: true, force: true });
    fs.mkdirSync(WORKSPACE, { recursive: true });

    const files = getFiles(ROOT, 30);
    const skip = [WORKSPACE, path.join(ROOT, ".git"), path.join(ROOT, "node_modules"), path.join(ROOT, "backup"), path.join(ROOT, "backups")];

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
  } else {
    git("checkout main 2>nul || git checkout master 2>nul");
    git("reset --hard HEAD");
    git("clean -fd");
  }
}

function backupFile(filePath) {
  const src = path.join(WORKSPACE, filePath);
  const dest = path.join(BACKUP, filePath);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function createAgentBranch(taskName) {
  const safe = taskName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 30).replace(/-$/, "");
  const branch = `agent/${safe || "run"}-${Date.now()}`;
  git(`checkout -b ${branch}`);
  agentState.branch = branch;
  return branch;
}

function snapshot(taskName) {
  git("add .");
  try {
    git(`commit -m "snapshot before agent: ${taskName}" --allow-empty`);
  } catch {}
}

function applyPatch(filePath, diff) {
  const full = path.join(WORKSPACE, filePath);
  let content = "";
  try {
    content = fs.readFileSync(full, "utf-8");
  } catch {
    content = "";
  }
  backupFile(filePath);
  const patched = applyUnifiedDiff(content, diff);
  fs.writeFileSync(full, patched);
}

function applyPatchToWorkspace(pr) {
  for (const file of pr.files) {
    console.log(`[PATCH] ${file.path}`);
    try {
      applyPatch(file.path, file.patch);
    } catch (e) {
      console.log(`[ERROR] ${file.path}`);
    }
  }
}

function runChecks() {
  try {
    execSync("node index.js", { cwd: WORKSPACE, stdio: "ignore" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

function rollback() {
  console.log("[ROLLBACK] git reset --hard");
  try {
    git("reset --hard");
    git("clean -fd");
  } catch {}
}

function generatePR() {
  const target = context.topFiles[0] || { file: "/index.js" };

  return {
    title: `AI: ${task}`,
    summary: "AI real diff proposal",
    risk: "unknown",
    files: [
      {
        path: target.file,
        patch: `@@ -1,3 +1,3 @@\n-old line\n+new line (${task})`,
        reason: `Modified for task: ${task}`
      }
    ]
  };
}

function validatePR(pr) {
  if (!pr?.files?.length) return false;
  return pr.files.every(f => f.path && f.patch && f.reason);
}

function selfHeal(pr, maxRetries = 3) {
  let current = pr;
  const branch = createAgentBranch(pr.title || pr.task);
  snapshot(pr.title || pr.task);

  for (let i = 0; i < maxRetries; i++) {
    console.log(`[LOOP] Attempt ${i + 1}`);
    applyPatchToWorkspace(current);
    const check = runChecks();

    if (check.ok) {
      console.log("[LOOP] SUCCESS");
      return { pr: current, branch };
    }

    console.log("[LOOP] FAILED → rollback");
    agentState.lastError = check.error?.slice(0, 200);
    agentState.status = "retrying";
    writeState();
    rollback();

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

fs.mkdirSync(LOGS, { recursive: true });

prepareWorkspace();

const context = buildContext();

fs.writeFileSync(path.join(LOGS, "context.json"), JSON.stringify(context, null, 2));

agentState.context = {
  totalFiles: context.totalFiles,
  topFiles: context.topFiles.slice(0, 10).map(f => f.file)
};
agentState.status = "context_ready";
writeState();

const pr = generatePR();

if (!validatePR(pr)) {
  console.log("[AGENT] Invalid PR");
  agentState.status = "invalid_pr";
  writeState();
  process.exit(1);
}

const result = selfHeal(pr);

if (result) {
  fs.writeFileSync(path.join(LOGS, "pr.json"), JSON.stringify(result, null, 2));
  git("add .");
  git(`commit -m "agent: ${pr.title}" --allow-empty`);

  agentState.status = "committed";
  writeState();
  console.log("[AGENT v0.9.0] COMMITTED");
} else {
  agentState.status = "failed";
  writeState();
  console.log("[AGENT v0.9.0] FAILED");
}
