const fs = require("fs");
const path = require("path");
const DEVOS = require("../config");

const IGNORE_PATTERNS = ["node_modules", ".git", "workspace", "repo", "backup"];

function getFiles(dir, max = 15) {
  let results = [];
  function walk(d) {
    if (results.length >= max) return;
    const entries = fs.readdirSync(d);
    for (const e of entries) {
      const full = path.join(d, e);
      if (IGNORE_PATTERNS.some(p => full.includes(p))) continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else {
        results.push(full);
      }
      if (results.length >= max) return;
    }
  }
  walk(dir);
  return results;
}

module.exports = { getFiles, IGNORE_PATTERNS };
