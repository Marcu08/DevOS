const path = require("path");
const fs = require("fs");
const DEVOS = require("../../config");

const KNOWLEDGE_PATH = path.join(DEVOS.logs, "memory-knowledge.json");

function load() {
  try { return JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, "utf-8")); }
  catch { return { entries: [], relationships: [] }; }
}

function save(data) {
  fs.mkdirSync(path.dirname(KNOWLEDGE_PATH), { recursive: true });
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(data, null, 2));
}

function addEntry(entry) {
  const data = load();
  const existing = data.entries.findIndex(e => e.problem === entry.problem && e.solution === entry.solution);
  if (existing >= 0) {
    data.entries[existing].successRate = ((data.entries[existing].successRate * data.entries[existing].count) + (entry.success || 0)) / (data.entries[existing].count + 1);
    data.entries[existing].count++;
    data.entries[existing].lastUsed = new Date().toISOString();
  } else {
    data.entries.push({
      id: data.entries.length + 1,
      problem: entry.problem,
      solution: entry.solution,
      files: entry.files || [],
      projectType: entry.projectType || "unknown",
      agent: entry.agent || "unknown",
      successRate: entry.success || 0,
      count: 1,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    });
  }
  if (data.entries.length > 200) data.entries = data.entries.slice(-200);
  save(data);
}

function addRelationship(fromId, toId, type) {
  const data = load();
  data.relationships.push({
    from: fromId,
    to: toId,
    type: type || "related",
    timestamp: new Date().toISOString(),
  });
  if (data.relationships.length > 500) data.relationships = data.relationships.slice(-500);
  save(data);
}

function search(query) {
  const data = load();
  const q = query.toLowerCase();
  return data.entries.filter(e =>
    e.problem.toLowerCase().includes(q) ||
    e.solution.toLowerCase().includes(q) ||
    (e.files || []).some(f => f.toLowerCase().includes(q))
  ).map(e => ({
    ...e,
    confidence: e.count > 0 ? Math.min(1, e.successRate * e.count / 5) : 0,
  })).sort((a, b) => b.confidence - a.confidence);
}

function findByProblem(problem) {
  const data = load();
  return data.entries
    .filter(e => e.problem.toLowerCase().includes(problem.toLowerCase()))
    .sort((a, b) => b.successRate - a.successRate);
}

function findByFile(file) {
  const data = load();
  return data.entries
    .filter(e => (e.files || []).some(f => f.includes(file)))
    .sort((a, b) => b.successRate - a.successRate);
}

function getSimilar(query, limit) {
  const data = load();
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return data.entries.map(e => {
    const text = `${e.problem} ${e.solution} ${(e.files || []).join(" ")}`.toLowerCase();
    const matches = words.filter(w => text.includes(w)).length;
    const score = words.length > 0 ? matches / words.length : 0;
    return { ...e, similarity: score, confidence: score * e.successRate };
  }).filter(e => e.similarity > 0.1).sort((a, b) => b.confidence - a.confidence).slice(0, limit || 5);
}

function stats() {
  const data = load();
  const entries = data.entries;
  return {
    total: entries.length,
    relationships: data.relationships.length,
    avgSuccessRate: entries.length > 0 ? (entries.reduce((s, e) => s + e.successRate, 0) / entries.length * 100).toFixed(1) + "%" : "N/A",
    topAgents: getTopItems(entries, "agent"),
    topProjectTypes: getTopItems(entries, "projectType"),
    totalUses: entries.reduce((s, e) => s + e.count, 0),
  };
}

function getTopItems(entries, field) {
  const freq = {};
  for (const e of entries) {
    const val = e[field] || "unknown";
    freq[val] = (freq[val] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ [k]: v }));
}

function explain(entryId) {
  const data = load();
  const entry = data.entries.find(e => e.id === entryId);
  if (!entry) return null;
  const rels = data.relationships.filter(r => r.from === entryId || r.to === entryId);
  const related = rels.map(r => {
    const otherId = r.from === entryId ? r.to : r.from;
    return data.entries.find(e => e.id === otherId);
  }).filter(Boolean);
  return { entry, relationships: rels, relatedEntries: related };
}

module.exports = { addEntry, addRelationship, search, findByProblem, findByFile, getSimilar, stats, explain, load };
