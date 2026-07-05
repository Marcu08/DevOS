const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

const SOLUTIONS_PATH = path.join(DEVOS.logs, "memory-solutions.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(SOLUTIONS_PATH, "utf-8"));
  } catch {
    return { solutions: [] };
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(SOLUTIONS_PATH), { recursive: true });
  fs.writeFileSync(SOLUTIONS_PATH, JSON.stringify(data, null, 2));
}

function cache(task, solution) {
  const data = load();
  const key = task.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40);

  const existing = data.solutions.findIndex(s => s.key === key);
  const entry = {
    key,
    task,
    solution,
    used: (existing >= 0 ? data.solutions[existing].used : 0) + 1,
    lastUsed: new Date().toISOString(),
  };

  if (existing >= 0) data.solutions[existing] = entry;
  else data.solutions.push(entry);

  if (data.solutions.length > 50) data.solutions = data.solutions.slice(-50);
  save(data);
}

function recall(task) {
  const data = load();
  const key = task.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40);
  return data.solutions.find(s => s.key === key)?.solution || null;
}

function findSimilar(task) {
  const data = load();
  const words = task.toLowerCase().split(/\s+/);
  return data.solutions
        .map(s => ({
          ...s,
          relevance: words.filter(w => s.task.toLowerCase().includes(w)).length,
        }))
        .filter(s => s.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3);
}

module.exports = { cache, recall, findSimilar };
