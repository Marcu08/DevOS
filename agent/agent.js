const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = "C:\\DevOs";
const LOGS = path.join(ROOT, "logs");

const task = process.argv[2] || "analyze project";

function run(cmd) {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd: ROOT,
      stdio: ["pipe", "pipe", "ignore"]
    });
  } catch (e) {
    return "";
  }
}

// ------------------------
// 1. CONTEXT BUILD
// ------------------------

let gitStatus = run("git status");
let gitDiff = run("git diff");

// ------------------------
// 2. SIMPLE FILE SCAN
// ------------------------

function getFiles(dir, max = 15) {
  let results = [];

  function walk(d) {
    if (results.length >= max) return;

    const entries = fs.readdirSync(d);

    for (const e of entries) {
      const full = path.join(d, e);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        if (!full.includes("node_modules") && !full.includes(".git")) {
          walk(full);
        }
      } else {
        results.push(full);
      }

      if (results.length >= max) break;
    }
  }

  walk(dir);
  return results;
}

const files = getFiles(ROOT);

// ------------------------
// 3. BUILD SNAPSHOT
// ------------------------

const snapshot = files.map(f => {
  try {
    return {
      file: f.replace(ROOT, ""),
      content: fs.readFileSync(f, "utf-8").slice(0, 1500)
    };
  } catch {
    return null;
  }
}).filter(Boolean);

// ------------------------
// 4. PR GENERATION (MOCK AI LAYER)
// ------------------------
// qui in futuro colleghi opencode / LLM

function generatePR() {
  return {
    task,
    summary: "AI refactor proposal",
    risk: "unknown",
    files: [
      {
        file: snapshot[0]?.file || "unknown.js",
        type: "modify",
        diff: `@@ -1,3 +1,3 @@\n- old\n+ improved (${task})`
      }
    ]
  };
}

const pr = generatePR();

// ------------------------
// 5. VALIDATION LAYER
// ------------------------

function validatePR(pr) {
  if (!pr.files || !Array.isArray(pr.files)) return false;
  if (pr.files.length === 0) return false;

  for (const f of pr.files) {
    if (!f.file || !f.type || !f.diff) return false;
  }

  return true;
}

const isValid = validatePR(pr);

// ------------------------
// 6. OUTPUT
// ------------------------

fs.mkdirSync(LOGS, { recursive: true });

if (isValid) {
  fs.writeFileSync(
    path.join(LOGS, "pr.json"),
    JSON.stringify(pr, null, 2)
  );

  console.log("[AGENT v0.8] PR generated");
  console.log("[AGENT v0.8] Ready for review");
} else {
  console.log("[AGENT v0.8] Invalid PR - aborted");
}