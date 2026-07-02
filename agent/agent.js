const fs = require("fs");
const { execSync } = require("child_process");

const task = process.argv[2] || "analyze project";
const cwd = process.cwd();

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd });
}

// 1. repo state
let status = "";
let diff = "";

try {
  status = run("git status");
  diff = run("git diff");
} catch {
  status = "NO_GIT";
  diff = "";
}

// 2. context object
const context = {
  task,
  cwd,
  status,
  diff,
  timestamp: new Date().toISOString()
};

fs.writeFileSync(
  "logs_diff.json",
  JSON.stringify({ diff }, null, 2)
);

fs.writeFileSync(
  "logs_context.json",
  JSON.stringify(context, null, 2)
);

// 3. AI prompt builder (OpenCode-ready)
const prompt = `
TASK:
${task}

GIT STATUS:
${status}

GIT DIFF:
${diff}

INSTRUCTIONS:
- analyze codebase
- propose improvements
- if safe, suggest patch format
`;

fs.writeFileSync("logs_prompt.txt", prompt);

console.log("[AGENT] Context built");
console.log("[AGENT] Ready for AI execution");