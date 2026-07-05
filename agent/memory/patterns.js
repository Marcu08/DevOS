const path = require("path");
const fs = require("fs");
const DEVOS = require("../config");

const PATTERNS_PATH = path.join(DEVOS.logs, "memory-patterns.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(PATTERNS_PATH, "utf-8"));
  } catch {
    return { patterns: [] };
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(PATTERNS_PATH), { recursive: true });
  fs.writeFileSync(PATTERNS_PATH, JSON.stringify(data, null, 2));
}

function record(filePattern, actions, success) {
  const data = load();
  const existing = data.patterns.find(p => p.file === filePattern);

  if (existing) {
    existing.count++;
    existing.lastUsed = new Date().toISOString();
    existing.successRate = ((existing.successRate * (existing.count - 1)) + (success ? 1 : 0)) / existing.count;
  } else {
    data.patterns.push({
      file: filePattern,
      actions,
      count: 1,
      successRate: success ? 1 : 0,
      firstSeen: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    });
  }

  if (data.patterns.length > 30) data.patterns = data.patterns.slice(-30);
  save(data);
}

function suggest(filePattern) {
  const data = load();
  return data.patterns
    .filter(p => filePattern.includes(p.file) || p.file.includes(filePattern))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 3);
}

module.exports = { record, suggest };
