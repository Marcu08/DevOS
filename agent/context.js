const fs = require("fs");
const path = require("path");
const DEVOS = require("./config");

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".json": "json", ".md": "markdown", ".ps1": "powershell", ".toml": "toml",
    ".lua": "lua", ".css": "css", ".html": "html", ".yml": "yaml", ".yaml": "yaml",
    ".sh": "shell", ".bat": "batch", ".env": "dotenv",
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

function countFunctions(content) {
  const regexes = [
    /function\s+\w+\s*\(/g,
    /(\w+)\s*[:=]\s*(?:async\s+)?function\s*\(/g,
    /(\w+)\s*[:=]\s*\([^)]*\)\s*=>/g,
    /(\w+)\s*\([^)]*\)\s*\{/g,
  ];
  const names = new Set();
  for (const re of regexes) {
    let match;
    while ((match = re.exec(content)) !== null) {
      if (match[1] && match[1] !== "if" && match[1] !== "for" && match[1] !== "while" && match[1] !== "switch" && match[1] !== "catch") {
        names.add(match[1]);
      }
    }
  }
  return names.size;
}

function countImports(content) {
  const matches = content.match(/(?:require\(|import\s+)/g);
  return matches ? matches.length : 0;
}

function scanRepo(dir = DEVOS.root, maxFiles = 200) {
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

  if (name === "/package.json") score += 12;
  if (name === "/readme.md") score += 8;
  if (name.includes("tsconfig") || name.includes("jsconfig")) score += 7;
  if (name.includes("vite.config") || name.includes("next.config")) score += 7;
  if (name.includes(".eslint") || name.includes("eslintrc")) score += 6;
  if (name.includes("docker") || name.includes("dockerfile")) score += 6;
  if (name.includes(".github") || name.includes("gitlab-ci") || name.includes("workflows")) score += 5;
  if (name.includes(".prettier") || name.includes("stylelint")) score += 4;

  return score;
}

function buildDependencyMap(files) {
  const map = {};

  for (const filePath of files) {
    const rel = filePath.replace(DEVOS.root, "").replace(/\\/g, "/");

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
    .map(f => {
      const rel = f.replace(DEVOS.root, "").replace(/\\/g, "/");
      let content = "";
      try { content = fs.readFileSync(f, "utf-8"); } catch {}

      return {
        file: rel,
        language: detectLanguage(f),
        score: rankFile(rel),
        complexity: {
          lines: content ? content.split("\n").length : 0,
          functions: content ? countFunctions(content) : 0,
          imports: content ? countImports(content) : 0,
          exports: content ? detectExports(content).length : 0,
        },
      };
    })
    .sort((a, b) => b.score - a.score);

  const dependencyMap = buildDependencyMap(files);

  const filesWithExports = {};
  for (const filePath of files) {
    const rel = filePath.replace(DEVOS.root, "").replace(/\\/g, "/");
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const detected = detectExports(content);
      if (detected.length > 0) {
        filesWithExports[rel] = detected;
      }
    } catch {}
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

module.exports = { buildContext };
