const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ========================
// ROOT CONFIG
// ========================

const ROOT = "C:\\DevOs";
const WORKSPACE = "C:\\DevOs\\workspace";
const LOGS = path.join(ROOT, "logs");
const BACKUP = "C:\\DevOs\\backup\\workspace";

const task = process.argv[2] || "analyze project";

// ========================
// UTILS
// ========================

function run(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "ignore"]
    });
  } catch {
    return "";
  }
}

// ========================
// FILE SCAN
// ========================

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

// ========================
// WORKSPACE
// ========================

function prepareWorkspace() {
  fs.rmSync(WORKSPACE, { recursive: true, force: true });
  fs.mkdirSync(WORKSPACE, { recursive: true });

  const files = getFiles(ROOT, 30);

  for (const f of files) {
    const rel = f.replace(ROOT, "");
    const dest = path.join(WORKSPACE, rel);

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f, dest);
  }
}

// ========================
// BACKUP SYSTEM
// ========================

function backupFile(filePath) {
  const src = path.join(WORKSPACE, filePath);
  const dest = path.join(BACKUP, filePath);

  if (!fs.existsSync(src)) return;

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// ========================
// PATCH ENGINE
// ========================

function applyPatch(filePath, diff) {
  const full = path.join(WORKSPACE, filePath);

  let content = "";

  try {
    content = fs.readFileSync(full, "utf-8");
  } catch {
    content = "";
  }

  backupFile(filePath);

  const patched = content + "\n" + diff;

  fs.writeFileSync(full, patched);
}

// ========================
// APPLY PR
// ========================

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

// ========================
// CHECK SYSTEM
// ========================

function runChecks() {
  try {
    execSync("node index.js", {
      cwd: WORKSPACE,
      stdio: "ignore"
    });

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e.toString()
    };
  }
}

// ========================
// ROLLBACK
// ========================

function rollback() {
  console.log("[ROLLBACK] restoring backup...");

  try {
    const files = fs.readdirSync(BACKUP, { recursive: true });

    for (const f of files) {
      const src = path.join(BACKUP, f);
      const dest = path.join(WORKSPACE, f);

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  } catch {}

  console.log("[ROLLBACK] done");
}

// ========================
// PR GENERATION (MOCK AI)
// ========================

function generatePR() {
  const files = getFiles(ROOT, 10);

  return {
    task,
    summary: "AI refactor proposal",
    risk: "unknown",
    files: [
      {
        file: files[0]?.replace(ROOT, "") || "index.js",
        type: "modify",
        diff: `// AI change for: ${task}`
      }
    ]
  };
}

// ========================
// VALIDATION
// ========================

function validatePR(pr) {
  if (!pr?.files?.length) return false;

  return pr.files.every(f =>
    f.file && f.type && f.diff
  );
}

// ========================
// SELF HEAL LOOP
// ========================

function selfHeal(pr, maxRetries = 3) {
  let current = pr;

  for (let i = 0; i < maxRetries; i++) {
    console.log(`[LOOP] Attempt ${i + 1}`);

    applyPatchToWorkspace(current);

    const check = runChecks();

    if (check.ok) {
      console.log("[LOOP] SUCCESS");
      return current;
    }

    console.log("[LOOP] FAILED → rollback");

    rollback();

    current = {
      ...current,
      files: current.files.map(f => ({
        ...f,
        diff:
          f.diff +
          `\n// retry ${i + 1}\n// error: ${check.error?.slice(0, 120)}`
      }))
    };
  }

  console.log("[LOOP] MAX RETRIES REACHED");
  return null;
}

// ========================
// MAIN
// ========================

fs.mkdirSync(LOGS, { recursive: true });
fs.mkdirSync(BACKUP, { recursive: true });

prepareWorkspace();

const pr = generatePR();

if (!validatePR(pr)) {
  console.log("[AGENT] Invalid PR");
  process.exit(1);
}

const result = selfHeal(pr);

fs.writeFileSync(
  path.join(LOGS, "pr.json"),
  JSON.stringify(result || pr, null, 2)
);

console.log("[AGENT v0.8.2] DONE");