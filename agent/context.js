const fs = require("fs");
const path = require("path");

const ROOT = "C:\\DevOs";

function scanRepo(dir = ROOT, maxFiles = 200) {
  const files = [];

  function walk(current) {
    if (files.length >= maxFiles) return;

    const entries = fs.readdirSync(current);

    for (const e of entries) {
      const full = path.join(current, e);

      if (full.includes("node_modules") || full.includes(".git") || full.includes("workspace") || full.includes("repo") || full.includes("backup")) {
        continue;
      }

      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full);
      } else {
        files.push(full);
      }

      if (files.length >= maxFiles) break;
    }
  }

  walk(dir);

  return files;
}

function rankFile(file) {
  const name = file.toLowerCase();

  let score = 0;

  if (name.includes("index")) score += 10;
  if (name.endsWith(".ts")) score += 8;
  if (name.endsWith(".js")) score += 6;
  if (name.endsWith(".json")) score += 4;
  if (name.endsWith(".ps1")) score += 3;

  return score;
}

function buildDependencyMap(files) {
  const map = {};

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");

      const imports = [];

      const requireMatches = content.match(/require\(["'`](.*?)["'`]\)/g) || [];
      const importMatches = content.match(/import .* from ["'`](.*?)["'`]/g) || [];

      [...requireMatches, ...importMatches].forEach(m => {
        const mod = m.split(/["'`]/)[1];
        imports.push(mod);
      });

      map[file.replace(ROOT, "").replace(/\\/g, "/")] = imports;
    } catch {
      map[file.replace(ROOT, "").replace(/\\/g, "/")] = [];
    }
  }

  return map;
}

function buildContext() {
  const files = scanRepo();

  const ranked = files
    .map(f => ({
      file: f.replace(ROOT, "").replace(/\\/g, "/"),
      score: rankFile(f)
    }))
    .sort((a, b) => b.score - a.score);

  const dependencyMap = buildDependencyMap(files);

  const context = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    topFiles: ranked.slice(0, 20),
    dependencyMap
  };

  return context;
}

module.exports = {
  buildContext
};
