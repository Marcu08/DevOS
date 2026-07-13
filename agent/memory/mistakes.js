const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

const MISTAKES_PATH = path.join(DEVOS.logs, "memory-mistakes.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(MISTAKES_PATH, "utf-8"));
  } catch {
    return { mistakes: [] };
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(MISTAKES_PATH), { recursive: true });
  fs.writeFileSync(MISTAKES_PATH, JSON.stringify(data, null, 2));
}

function record(task, error, context) {
  const data = load();
  data.mistakes.push({
    id: data.mistakes.length + 1,
    timestamp: new Date().toISOString(),
    task,
    error: error?.slice(0, 300) || "Unknown error",
    file: context?.file || null,
    stage: context?.stage || "unknown",
  });
  if (data.mistakes.length > 50) data.mistakes = data.mistakes.slice(-50);
  save(data);
}

function recentErrors(count = 5) {
  const data = load();
  return data.mistakes.slice(-count).reverse();
}

function similarTo(error) {
  const data = load();
  const key = (error || "").toLowerCase().slice(0, 50);
  return data.mistakes.filter(m => m.error.toLowerCase().includes(key));
}

module.exports = { record, recentErrors, similarTo, load };
