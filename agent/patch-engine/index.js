const { apply } = require("./applier");
const { generate } = require("./generator");
const { parse } = require("./parser");

function applyDiff(content, diff) {
  return apply(content, diff);
}

function generateDiff(oldContent, newContent) {
  return generate(oldContent, newContent);
}

module.exports = { applyDiff, generateDiff, parse };
