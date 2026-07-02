const { execSync } = require("child_process");
const fs = require("fs");

const task = process.argv[2] || "no task";
const cwd = process.argv[3] || process.cwd();

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd });
}

console.log("[AGENT] Task:", task);
console.log("[AGENT] CWD:", cwd);

// safety: git check
let gitStatus = "";
try {
  gitStatus = run("git status");
} catch {
  gitStatus = "NOT A GIT REPO";
}

// context
const context = {
  task,
  cwd,
  git: gitStatus,
  time: new Date().toISOString()
};

fs.writeFileSync("logs_context.json", JSON.stringify(context, null, 2));

console.log("[AGENT] Context saved");

// open AI tool (opencode)
try {
  run(`opencode "${task}"`);
} catch (e) {
  console.log("[AGENT] OpenCode not available");
}