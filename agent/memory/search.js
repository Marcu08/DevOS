const history = require("./history");
const mistakes = require("./mistakes");
const patterns = require("./patterns");
const solutions = require("./solutions");

function all() {
  return {
    history: history.load().runs || [],
    mistakes: mistakes.load().mistakes || [],
    patterns: patterns.load().patterns || [],
    solutions: solutions.load().solutions || [],
  };
}

function byTask(query) {
  query = query.toLowerCase();
  const results = [];
  const data = all();
  for (const r of data.history) {
    if ((r.task || "").toLowerCase().includes(query)) results.push({ type: "run", data: r });
  }
  for (const m of data.mistakes) {
    if ((m.task || "").toLowerCase().includes(query)) results.push({ type: "mistake", data: m });
  }
  for (const s of data.solutions) {
    if ((s.task || "").toLowerCase().includes(query)) results.push({ type: "solution", data: s });
  }
  return results;
}

function byError(query) {
  query = query.toLowerCase();
  return mistakes.load().mistakes
    .filter(m => (m.error || "").toLowerCase().includes(query))
    .map(m => ({ type: "mistake", data: m }));
}

function byFile(query) {
  query = query.toLowerCase();
  const results = [];
  const data = all();
  for (const p of data.patterns) {
    if ((p.file || "").toLowerCase().includes(query)) results.push({ type: "pattern", data: p });
  }
  return results;
}

function recent(count = 20) {
  const results = [];
  const data = all();
  const allItems = [];
  for (const r of data.history) allItems.push({ type: "run", ts: r.timestamp, data: r });
  for (const m of data.mistakes) allItems.push({ type: "mistake", ts: m.timestamp, data: m });
  allItems.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
  return allItems.slice(0, count);
}

function stats() {
  const data = all();
  return {
    runs: data.history.length,
    mistakes: data.mistakes.length,
    patterns: data.patterns.length,
    solutions: data.solutions.length,
    successRate: data.history.length > 0
      ? (data.history.filter(r => r.status === "completed").length / data.history.length * 100).toFixed(1) + "%"
      : "N/A",
    mostErrorStage: _mostCommon(data.mistakes.map(m => m.stage)),
  };
}

function _mostCommon(arr) {
  if (arr.length === 0) return "none";
  const freq = {};
  for (const item of arr) freq[item] = (freq[item] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

module.exports = { all, byTask, byError, byFile, recent, stats };
