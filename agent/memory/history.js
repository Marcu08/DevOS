const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

const HISTORY_PATH = path.join(DEVOS.logs, "memory-history.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
  } catch {
    return { runs: [] };
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2));
}

function addRun(entry) {
  const data = load();
  data.runs.push({
    id: data.runs.length + 1,
    timestamp: new Date().toISOString(),
    task: entry.task,
    status: entry.status,
    confidence: entry.confidence,
    risk: entry.risk,
    filesChanged: entry.filesChanged || 0,
    steps: entry.steps || 0,
    error: entry.error || null,
    duration: entry.duration || 0,
  });
  if (data.runs.length > 100) data.runs = data.runs.slice(-100);
  save(data);
  return data.runs.length;
}

function recent(count = 5) {
  const data = load();
  return data.runs.slice(-count).reverse();
}

function stats() {
  const data = load();
  const total = data.runs.length;
  const succeeded = data.runs.filter(r => r.status === "completed").length;
  const failed = data.runs.filter(r => r.status === "failed").length;
  return { total, succeeded, failed, rate: total > 0 ? (succeeded / total * 100).toFixed(1) + "%" : "N/A" };
}

module.exports = { addRun, recent, stats, load };
