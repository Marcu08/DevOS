const fs = require("fs");
const crypto = require("crypto");
const DEVOS = require("../config");
const cache = require("../cache/index");
const { scanRepo } = require("./scanner");
const { detectLanguage, detectExports, countFunctions, countImports } = require("./analyzer");
const { rankFile } = require("./ranker");

const CACHE_VERSION = 1;
const CACHE_TYPE = "context";
const CACHE_KEY = "project";

function contextFingerprint(files) {
  const entries = files.map((filePath) => {
    try {
      const stat = fs.statSync(filePath);
      return `${filePath}|${stat.mtimeMs}|${stat.size}`;
    } catch {
      return `${filePath}|missing`;
    }
  }).sort();

  return crypto
    .createHash("md5")
    .update(`${CACHE_VERSION}\n${DEVOS.root}\n${entries.join("\n")}`)
    .digest("hex");
}

function extractImports(content) {
  const imports = [];
  const requireMatches = content.match(/require\(["'`](.*?)["'`]\)/g) || [];
  const importMatches = content.match(/import .* from ["'`](.*?)["'`]/g) || [];

  [...requireMatches, ...importMatches].forEach((match) => {
    imports.push(match.split(/["'`]/)[1]);
  });

  return imports;
}

function buildContextFromFiles(files) {
  // Read each file once and derive every context field from the same buffer.
  // The previous implementation read each file three times (ranking, dependency
  // map, exports map), which dominated context build time.
  const records = files.map((filePath) => {
    const file = filePath.replace(DEVOS.root, "").replace(/\\/g, "/");
    let content = "";

    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      // Unreadable files still appear in the context with empty metadata.
    }

    const exports = content ? detectExports(content) : [];

    return {
      file,
      language: detectLanguage(filePath),
      score: rankFile(file),
      imports: content ? extractImports(content) : [],
      exports,
      complexity: {
        lines: content ? content.split("\n").length : 0,
        functions: content ? countFunctions(content) : 0,
        imports: content ? countImports(content) : 0,
        exports: exports.length,
      },
    };
  });

  const ranked = records
    .map(({ file, language, score, complexity }) => ({ file, language, score, complexity }))
    .sort((a, b) => b.score - a.score);

  const dependencyMap = {};
  const filesWithExports = {};
  for (const record of records) {
    dependencyMap[record.file] = record.imports;
    if (record.exports.length > 0) {
      filesWithExports[record.file] = record.exports;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    topFiles: ranked.slice(0, 20),
    dependencyMap,
    exportsMap: filesWithExports,
  };
}

function buildContext(options = {}) {
  const files = scanRepo();
  const useCache = options.cache !== false && process.env.DEVOS_NO_CACHE !== "1";

  if (!useCache) {
    return buildContextFromFiles(files);
  }

  const fingerprint = contextFingerprint(files);

  try {
    const cached = cache.get(CACHE_TYPE, CACHE_KEY);
    if (
      cached &&
      cached.version === CACHE_VERSION &&
      cached.root === DEVOS.root &&
      cached.fingerprint === fingerprint &&
      cached.context
    ) {
      return { ...cached.context, timestamp: new Date().toISOString() };
    }
  } catch {
    // A broken or unwritable cache must never prevent context building.
  }

  const context = buildContextFromFiles(files);

  try {
    cache.set(CACHE_TYPE, CACHE_KEY, {
      version: CACHE_VERSION,
      root: DEVOS.root,
      fingerprint,
      context,
    });
  } catch {
    // Best-effort cache write.
  }

  return context;
}

module.exports = { buildContext };

