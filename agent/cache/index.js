const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const DEVOS = require("../config");
const log = require("../logger").get();

const CACHE_DIR = path.join(DEVOS.logs, "cache");
const METRICS_FILE = path.join(CACHE_DIR, "metrics.json");

function ensureDir() { fs.mkdirSync(CACHE_DIR, { recursive: true }); }

function hash(content) {
  return crypto.createHash("md5").update(typeof content === "string" ? content : JSON.stringify(content)).digest("hex").slice(0, 16);
}

function fileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return hash(content);
  } catch { return null; }
}

function getCacheKey(type, key) {
  return `${type}:${hash(key)}`;
}

function get(type, key) {
  ensureDir();
  const cacheKey = getCacheKey(type, key);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    recordMetric("hit", type);
    return data.value;
  } catch {
    recordMetric("miss", type);
    return null;
  }
}

function set(type, key, value) {
  ensureDir();
  const cacheKey = getCacheKey(type, key);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
  fs.writeFileSync(cacheFile, JSON.stringify({ key, value, cached: new Date().toISOString(), type }, null, 2));
}

function invalidate(type) {
  ensureDir();
  const files = fs.readdirSync(CACHE_DIR);
  for (const f of files) {
    if (f.endsWith(".json") && f !== "metrics.json") {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), "utf-8"));
        if (!type || data.type === type) fs.unlinkSync(path.join(CACHE_DIR, f));
      } catch {}
    }
  }
}

function recordMetric(result, type) {
  ensureDir();
  let metrics = { hits: 0, misses: 0, byType: {} };
  try { metrics = JSON.parse(fs.readFileSync(METRICS_FILE, "utf-8")); } catch {}
  if (result === "hit") metrics.hits++;
  else metrics.misses++;
  if (!metrics.byType[type]) metrics.byType[type] = { hits: 0, misses: 0 };
  metrics.byType[type][result === "hit" ? "hits" : "misses"]++;
  metrics.total = metrics.hits + metrics.misses;
  metrics.efficiency = metrics.total > 0 ? (metrics.hits / metrics.total * 100).toFixed(1) + "%" : "N/A";
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

function metrics() {
  try { return JSON.parse(fs.readFileSync(METRICS_FILE, "utf-8")); }
  catch { return { hits: 0, misses: 0, total: 0, efficiency: "N/A", byType: {} }; }
}

function scanFiles(rootDir) {
  const fileHashes = {};
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else fileHashes[full.replace(rootDir, "")] = fileHash(full);
      }
    } catch {}
  }
  walk(rootDir);
  return fileHashes;
}

function hasChanged(rootDir, previousHashes) {
  const current = scanFiles(rootDir);
  if (!previousHashes) return { changed: true, current };
  for (const [file, h] of Object.entries(current)) {
    if (previousHashes[file] !== h) return { changed: true, file, current };
  }
  return { changed: false, current };
}

module.exports = { get, set, invalidate, metrics, scanFiles, hasChanged, hash, fileHash };
