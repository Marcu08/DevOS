const { parse } = require("./parser");

function apply(content, diff) {
  const hunks = parse(diff);
  if (hunks.length === 0) return content;

  let lines = content.split("\n");

  for (const hunk of hunks) {
    const removed = [];
    const added = [];
    const ctxBefore = [];
    const ctxAfter = [];
    let sawChange = false;

    for (const l of hunk.lines) {
      if (l.startsWith("-") && !l.startsWith("--")) {
        sawChange = true;
        removed.push(l.slice(1));
      } else if (l.startsWith("+") && !l.startsWith("++")) {
        sawChange = true;
        added.push(l.slice(1));
      } else if (l.startsWith(" ")) {
        if (sawChange) ctxAfter.push(l.slice(1));
        else ctxBefore.push(l.slice(1));
      }
    }

    const pos = hunk.oldStart - 1;

    const before = lines.slice(0, pos);
    const after = lines.slice(pos + removed.length);

    lines = [...before, ...added, ...after];
  }

  return lines.join("\n");
}

module.exports = { apply };
