const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "..", "config", "devos.json");

let cfg = null;

function load() {
  if (cfg) return cfg;
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  cfg = JSON.parse(raw);
  return cfg;
}

load();

const DEVOS = {
  root: cfg.root,
  workspace: path.join(cfg.root, "workspace"),
  logs: path.join(cfg.root, "logs"),
  backup: path.join(cfg.root, "backup", "workspace"),
  config: cfg,
};

module.exports = DEVOS;
