const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");

const MODES = {
  autonomous: { label: "Autonomous", requiresApproval: [], parallel: true },
  assisted: { label: "Assisted", requiresApproval: ["execute", "dangerous"], parallel: true },
  safe: { label: "Safe", requiresApproval: ["all"], parallel: false },
};

const DANGEROUS_PATTERNS = [
  { pattern: /package\.json|yarn\.lock|pnpm-lock\.yaml/, label: "dependency change" },
  { pattern: /\.env|credentials|secret|key\./, label: "security file" },
  { pattern: /database|schema|migration|db\./, label: "database change" },
  { pattern: /\.(pem|key|crt|p12|cert)$/, label: "certificate file" },
  { pattern: /Dockerfile|docker-compose/, label: "container config" },
  { pattern: /\.github\/workflows/, label: "CI/CD change" },
];

const MODE_FILE = path.join(DEVOS.config.configDir || path.join(DEVOS.root, "config"), "mode.json");

function getModeDir() {
  return path.dirname(MODE_FILE);
}

function current() {
  try {
    const data = JSON.parse(fs.readFileSync(MODE_FILE, "utf-8"));
    return MODES[data.mode] ? data.mode : "autonomous";
  } catch {
    return "autonomous";
  }
}

function setMode(mode) {
  if (!MODES[mode]) return { error: true, message: `Invalid mode: ${mode}. Available: ${Object.keys(MODES).join(", ")}` };
  fs.mkdirSync(getModeDir(), { recursive: true });
  fs.writeFileSync(MODE_FILE, JSON.stringify({ mode, updated: new Date().toISOString() }, null, 2));
  return { error: false, message: `Mode set to: ${mode} (${MODES[mode].label})` };
}

function getModeConfig() {
  const mode = current();
  return MODES[mode];
}

function needsApproval(operation, files) {
  const modeConfig = getModeConfig();
  if (modeConfig.requiresApproval.includes("all")) return { required: true, reason: "Safe mode requires approval for all operations" };
  if (modeConfig.requiresApproval.includes(operation)) return { required: true, reason: `Operation '${operation}' requires approval in ${current()} mode` };
  if (modeConfig.requiresApproval.includes("dangerous") && isDangerous(files)) {
    return { required: true, reason: `Dangerous file change detected` };
  }
  return { required: false };
}

function isDangerous(files) {
  if (!files || files.length === 0) return false;
  for (const file of files) {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.pattern.test(file)) return true;
    }
  }
  return false;
}

function promptApproval(operation, reason) {
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`\n  ⚠  Approval Required [${current()} mode]\n  Operation: ${operation}\n  Reason: ${reason}\n  Approve? (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

const modes = Object.keys(MODES).map(k => ({ name: k, label: MODES[k].label }));

module.exports = { current, setMode, getModeConfig, needsApproval, isDangerous, promptApproval, modes, MODES };
