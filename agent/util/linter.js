const fs = require("fs");
const path = require("path");

const ESLINT_MARKERS = [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.yaml", ".eslintrc.yml", "eslint.config.js"];

function hasLinter(dir) {
  return ESLINT_MARKERS.some(m => fs.existsSync(path.join(dir, m)));
}

module.exports = { hasLinter, ESLINT_MARKERS };
