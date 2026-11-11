const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");

const IGNORE_PATTERNS = ["node_modules", ".git", "workspace", "repo", "backup"];

function scanRepo(dir = DEVOS.root, maxFiles = 200) {
  const files = [];

  function walk(current) {
    if (files.length >= maxFiles) return;

    const entries = fs.readdirSync(current);

    for (const e of entries) {
      const full = path.join(current, e);

      if (IGNORE_PATTERNS.some(p => full.includes(p))) continue;

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

module.exports = { scanRepo, IGNORE_PATTERNS };
