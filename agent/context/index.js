const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");
const { scanRepo } = require("./scanner");
const { detectLanguage, detectExports, countFunctions, countImports } = require("./analyzer");
const { rankFile } = require("./ranker");

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
