const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "..", "config", "devos.json");

let config = null;

function load() {
  if (config) return config;
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  config = JSON.parse(raw);
  return config;
}

function get(key) {
  return load()[key];
}

module.exports = { load, get };
