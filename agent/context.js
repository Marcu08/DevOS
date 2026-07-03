const fs = require("fs");
const path = require("path");

const WEIGHT_MAP = {
  ".js": 8,
  ".ts": 9,
  ".jsx": 8,
  ".tsx": 9,
  ".json": 4,
  ".md": 2,
  ".html": 3,
  ".css": 3,
  ".lua": 5,
  ".py": 7,
  ".yaml": 3,
  ".yml": 3,
  ".toml": 3,
  ".env": 5,
  ".gitignore": 4,
  "index.js": 10,
  "index.ts": 10,
  "package.json": 7,
  "config": 5,
};

function scanRepo(repoDir, maxFiles = 50) {
  const files = [];

  function walk(dir) {
    if (files.length >= maxFiles) return;

    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }

    for (const e of entries) {
      const full = path.join(dir, e);
      if (full.includes("node_modules") || full.includes(".git")) continue;

      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else {
          const rel = full.replace(repoDir, "").replace(/\\/g, "/");
          const ext = path.extname(full);
          const base = path.basename(full);

          let score = 1;
          score += WEIGHT_MAP[ext] || 1;
          score += WEIGHT_MAP[base] || 0;
          score += base === "index.js" || base === "index.ts" ? 5 : 0;
          score += Math.max(0, 5 - rel.split("/").length + 1);

          files.push({ path: rel, ext, size: stat.size, score });
        }
      } catch {}
    }
  }

  walk(repoDir);

  files.sort((a, b) => b.score - a.score);

  return {
    totalFiles: files.length,
    totalSize: files.reduce((s, f) => s + f.size, 0),
    files,
    topFiles: files.slice(0, 10),
  };
}

function buildDependencyMap(files) {
  const deps = {};
  for (const f of files) {
    const content = fs.readFileSync(f.fullPath, "utf-8");
    const requires = [];
    const requireRe = /require\(["']([^"']+)["']\)/g;
    const importRe = /from\s+["']([^"']+)["']/g;
    let match;
    while ((match = requireRe.exec(content)) !== null) {
      requires.push(match[1]);
    }
    while ((match = importRe.exec(content)) !== null) {
      requires.push(match[1]);
    }
    if (requires.length > 0) {
      deps[f.path] = requires;
    }
  }
  return deps;
}

module.exports = { scanRepo, buildDependencyMap };
