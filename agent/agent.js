const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { applyUnifiedDiff } = require("./utils/diff");

const ROOT = "C:\\DevOs";
const WORKSPACE = "C:\\DevOs\\workspace";
const LOGS = path.join(ROOT, "logs");
const BACKUP = "C:\\DevOs\\backup\\workspace";

const task = process.argv[2] || "analyze project";

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

    for (const f of files) {
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
  const safe = taskName.replace(/\s+/g, "-").slice(0, 30);
  const branch = `agent/${safe}-${Date.now()}`;
  git(`checkout -b ${branch}`);
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
    console.log(`[PATCH] ${file.file}`);
    try {
      applyPatch(file.file, file.diff);
    } catch (e) {
      console.log(`[ERROR] ${file.file}`);
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
  const files = getFiles(ROOT, 10);
  return {
    task,
    summary: "AI real diff proposal",
    risk: "unknown",
    files: [
      {
        file: files[0]?.replace(ROOT, "") || "index.js",
        type: "modify",
        diff: `@@ -1,3 +1,3 @@\n-old line\n+new line (${task})`
      }
    ]
  };
}

function validatePR(pr) {
  if (!pr?.files?.length) return false;
  return pr.files.every(f => f.file && f.type && f.diff);
}

function selfHeal(pr, maxRetries = 3) {
  let current = pr;
  const branch = createAgentBranch(pr.task);
  snapshot(pr.task);

  for (let i = 0; i < maxRetries; i++) {
    console.log(`[LOOP] Attempt ${i + 1}`);
    applyPatchToWorkspace(current);
    const check = runChecks();

    if (check.ok) {
      console.log("[LOOP] SUCCESS");
      return { pr: current, branch };
    }

    console.log("[LOOP] FAILED → rollback");
    rollback();

    current = {
      ...current,
      files: current.files.map(f => ({
        ...f,
        diff: f.diff + `\n// retry ${i + 1}\n// error: ${check.error?.slice(0, 120)}`
      }))
    };
  }

  return null;
}

fs.mkdirSync(LOGS, { recursive: true });

prepareWorkspace();

const pr = generatePR();

if (!validatePR(pr)) {
  console.log("[AGENT] Invalid PR");
  process.exit(1);
}

const result = selfHeal(pr);

if (result) {
  fs.writeFileSync(path.join(LOGS, "pr.json"), JSON.stringify(result, null, 2));
  git("add .");
  git(`commit -m "agent: ${pr.task}" --allow-empty`);
  console.log("[AGENT v0.8.4] COMMITTED");
} else {
  console.log("[AGENT v0.8.4] FAILED");
}
