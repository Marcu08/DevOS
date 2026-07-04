const fs = require("fs");
const path = require("path");
const config = require("./config");

const ROOT = config.get("root");

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".json": "json",
    ".md": "markdown",
    ".ps1": "powershell",
    ".toml": "toml",
    ".lua": "lua",
    ".css": "css",
    ".html": "html",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".sh": "shell",
    ".bat": "batch",
    ".env": "dotenv",
  };
  return map[ext] || "unknown";
}

function detectExports(content) {
  const exports = [];
  const patterns = [
    /module\.exports\s*=\s*\{([^}]+)\}/gs,
    /module\.exports\s*=\s*(\w+)/g,
    /export\s+(default\s+)?(\w+)/g,
    /exports\.(\w+)\s*=/g,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(content)) !== null) {
      if (re === patterns[0]) {
        const keys = match[1].split(",").map(k => k.trim().split(/\s*:\s*/).pop().trim()).filter(Boolean);
        keys.forEach(k => exports.push(k));
      } else {
        exports.push(match[1] || match[2]);
      }
    }
  }
  return [...new Set(exports)];
}

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

  for (const filePath of files) {
    const rel = filePath.replace(ROOT, "").replace(/\\/g, "/");

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const imports = [];

      const requireMatches = content.match(/require\(["'`](.*?)["'`]\)/g) || [];
      const importMatches = content.match(/import .* from ["'`](.*?)["'`]/g) || [];

      [...requireMatches, ...importMatches].forEach(m => {
        const mod = m.split(/["'`]/)[1];
        imports.push(mod);
      });

      map[rel] = imports;
    } catch {
      map[rel] = [];
    }
  }

  return map;
}

function buildContext() {
  const files = scanRepo();

  const ranked = files
    .map(f => ({
      file: f.replace(ROOT, "").replace(/\\/g, "/"),
      language: detectLanguage(f),
      score: rankFile(f)
    }))
    .sort((a, b) => b.score - a.score);

  const dependencyMap = buildDependencyMap(files);

  const filesWithExports = {};
  for (const filePath of files) {
    const rel = filePath.replace(ROOT, "").replace(/\\/g, "/");
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const detected = detectExports(content);
      if (detected.length > 0) {
        filesWithExports[rel] = detected;
      }
    } catch {
      // skip unreadable
    }
  }

  const context = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    topFiles: ranked.slice(0, 20),
    dependencyMap,
    exportsMap: filesWithExports,
  };

  return context;
}

module.exports = {
  buildContext
};
