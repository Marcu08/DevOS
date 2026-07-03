const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = "C:\\DevOs";
const LOGS = path.join(ROOT, "logs");
const WORKSPACE = "C:\\DevOs\\workspace";

const task = process.argv[2] || "analyze project";

// ------------------------
// UTILS
// ------------------------

function run(cmd, cwd = ROOT) {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "ignore"]
    });
  } catch (e) {
    return "";
  }
}

// ------------------------
// FILE SCAN
// ------------------------

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

// ------------------------
// WORKSPACE
// ------------------------

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

// ------------------------
// PR GENERATION (MOCK AI)
// ------------------------

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
        diff: `// simulated change for: ${task}`
      }
    ]
  };
}

// ------------------------
// VALIDATION
// ------------------------

function validatePR(pr) {
  if (!pr?.files?.length) return false;

  return pr.files.every(f =>
    f.file && f.type && f.diff
  );
}

// ------------------------
// APPLY PATCH (SAFE SIMPLIFIED)
// ------------------------

function applyPatchToWorkspace(pr) {
  for (const file of pr.files) {
    const target = path.join(WORKSPACE, file.file);

    fs.mkdirSync(path.dirname(target), { recursive: true });

    // SAFE MODE: overwrite simulation
    fs.writeFileSync(target, file.diff);
  }
}

// ------------------------
// CHECK SYSTEM
// ------------------------

function runChecks() {
  try {
    execSync("node index.js", {
      cwd: WORKSPACE,
      stdio: "ignore"
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

// ------------------------
// SELF HEAL LOOP
// ------------------------

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

    console.log("[LOOP] FAILED");

    current = {
      ...current,
      files: current.files.map(f => ({
        ...f,
        diff: f.diff + `\n// fix attempt ${i + 1}\n// error: ${check.error?.slice(0, 100)}`
      }))
    };
  }

  return null;
}

// ------------------------
// MAIN
// ------------------------

fs.mkdirSync(LOGS, { recursive: true });

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

console.log("[AGENT v0.8.1] DONE");     