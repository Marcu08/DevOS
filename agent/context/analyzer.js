const fs = require("fs");
const path = require("path");

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

module.exports = { detectLanguage, detectExports, countFunctions, countImports };
