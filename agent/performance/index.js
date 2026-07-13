const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");
const cache = require("../cache/index");
const log = require("../logger").get();

const METRICS_FILE = path.join(DEVOS.logs, "performance-metrics.json");

function loadMetrics() {
  try { return JSON.parse(fs.readFileSync(METRICS_FILE, "utf-8")); }
  catch { return { runs: [], agents: {}, totalTime: 0, totalTokens: 0 }; }
}

function saveMetrics(data) {
  fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
  fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2));
}

function recordRun(runData) {
  const data = loadMetrics();
  data.runs.push({
    task: runData.task,
    started: runData.started,
    duration: runData.duration,
    tokens: runData.tokens || 0,
    agents: runData.agents || [],
    cacheHits: runData.cacheHits || 0,
    cacheMisses: runData.cacheMisses || 0,
    status: runData.status,
  });
  data.totalTime += runData.duration || 0;
  data.totalTokens += runData.tokens || 0;
  if (data.runs.length > 100) data.runs = data.runs.slice(-100);
  saveMetrics(data);
}

function recordAgent(agentName, duration) {
  const data = loadMetrics();
  if (!data.agents[agentName]) data.agents[agentName] = { runs: 0, totalTime: 0, avgTime: 0 };
  data.agents[agentName].runs++;
  data.agents[agentName].totalTime += duration;
  data.agents[agentName].avgTime = data.agents[agentName].totalTime / data.agents[agentName].runs;
  saveMetrics(data);
}

function getStats() {
  const data = loadMetrics();
  const cacheMetrics = cache.metrics();
  const recent = data.runs.slice(-5).reverse();

  const agentStats = Object.entries(data.agents).map(([name, stats]) => ({
    name,
    runs: stats.runs,
    avgTime: `${stats.avgTime.toFixed(0)}ms`,
    totalTime: `${(stats.totalTime / 1000).toFixed(1)}s`,
  }));

  return {
    totalRuns: data.runs.length,
    totalTime: `${(data.totalTime / 1000).toFixed(1)}s`,
    avgTimePerRun: data.runs.length > 0 ? `${(data.totalTime / data.runs.length).toFixed(0)}ms` : "N/A",
    totalTokens: data.totalTokens,
    cacheEfficiency: cacheMetrics.efficiency,
    cacheHits: cacheMetrics.hits,
    cacheMisses: cacheMetrics.misses,
    agents: agentStats,
    recentRuns: recent.map(r => ({
      task: r.task?.slice(0, 40),
      duration: `${r.duration}ms`,
      status: r.status,
      agents: r.agents?.length || 0,
    })),
  };
}

function startTimer() {
  const start = Date.now();
  return { start, end: () => Date.now() - start };
}

module.exports = { recordRun, recordAgent, getStats, startTimer };
