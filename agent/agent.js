
const { execSync } = require("child_process");
const path = require("path");

const task = process.argv[2] || "analyze project";
const cwd = process.cwd();

const fs = require("fs");
const path = require("path");

const ROOT = "C:\\DevOs";

const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "devos.json"), "utf8")
);

const LOG_DIR = path.join(config.root, "logs");
const AGENT_DIR = path.join(config.root, "agent");

function run(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd });
}

// git state
let status = "";
let diff = "";

try {
  status = run("git status");
  diff = run("git diff");
} catch {
  status = "NO_GIT";
  diff = "";
}

// CONTEXT
const context = {
  task,
  cwd,
  status,
  diff,
  time: new Date().toISOString()
};

// SAVE CONTEXT
fs.mkdirSync(LOG_DIR, { recursive: true });

fs.writeFileSync(
  path.join(LOG_DIR, "context.json"),
  JSON.stringify(context, null, 2)
);

// PROPOSAL LAYER (NEW)
const proposal = {
  goal: task,
  summary: "AI analysis pending execution",
  changes: [],
  risk: "unknown"
};

fs.writeFileSync(
  path.join(LOG_DIR, "proposal.json"),
  JSON.stringify(proposal, null, 2)
);

// PROMPT BUILDER
const prompt = `
TASK:
${task}

GIT STATUS:
${status}

GIT DIFF:
${diff}

RULES:
- propose changes only
- do not apply automatically
- format as structured suggestions
`;

fs.writeFileSync(path.join(LOG_DIR, "prompt.json")),

console.log("[AGENT v0.6] Context built");
console.log("[AGENT v0.6] Proposal generated");
console.log("[AGENT v0.6] Ready for AI review");