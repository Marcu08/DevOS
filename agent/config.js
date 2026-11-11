const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(REPO_ROOT, "config", "devos.json");

// Load .env before reading configuration so provider keys and DEVOS_ROOT are
// available to every command. Real environment variables always win.
function loadDotEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).replace(/^export\s+/, "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

let cfg = null;

function load() {
  if (cfg) return cfg;
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  cfg = JSON.parse(raw);
  return cfg;
}

load();

// Resolve the project root from the environment, then a configured path that
// actually exists, then the repository this file belongs to. This keeps clones
// usable from any directory instead of relying on a machine-specific path.
function resolveRoot(config) {
  if (process.env.DEVOS_ROOT) return path.resolve(process.env.DEVOS_ROOT);
  if (config.root && fs.existsSync(config.root)) return path.resolve(config.root);
  return REPO_ROOT;
}

const root = resolveRoot(cfg);

const DEVOS = {
  root,
  workspace: path.join(root, "workspace"),
  logs: path.join(root, "logs"),
  backup: path.join(root, "backup", "workspace"),
  config: cfg,
};

module.exports = DEVOS;
