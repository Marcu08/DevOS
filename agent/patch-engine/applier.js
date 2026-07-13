const { parse } = require("./parser");

function apply(content, diff) {
  const hunks = parse(diff);
  if (hunks.length === 0) return content;

  let lines = content.split("\n");

  for (const hunk of hunks) {
    const ctxBefore = [];
    const removed = [];
    const added = [];
    let sawChange = false;

    for (const l of hunk.lines) {
      if (l.startsWith("-") && !l.startsWith("--")) {
        sawChange = true;
        removed.push(l.slice(1));
      } else if (l.startsWith("+") && !l.startsWith("++")) {
        sawChange = true;
        added.push(l.slice(1));
      } else if (l.startsWith(" ")) {
        if (!sawChange) ctxBefore.push(l.slice(1));
      }
    }

    const expectedPos = hunk.oldStart - 1;
    const actualPos = findHunkPosition(lines, expectedPos, ctxBefore, removed);
    if (actualPos === -1) {
      console.log(`[PATCH] Skipping hunk at line ${hunk.oldStart}: context mismatch`);
      continue;
    }

    const before = lines.slice(0, actualPos);
    const after = lines.slice(actualPos + removed.length);

    lines = [...before, ...added, ...after];
  }

  return lines.join("\n");
}

function findHunkPosition(lines, expectedPos, ctxBefore, removed) {
  if (ctxBefore.length === 0 && removed.length === 0) {
    return expectedPos;
  }

  for (let offset = 0; offset < 5; offset++) {
    for (const sign of [1, -1]) {
      const startPos = expectedPos + sign * offset;
      if (startPos < 0) continue;

      const segmentLen = ctxBefore.length + removed.length;
      if (startPos + segmentLen > lines.length) continue;

      let match = true;

      for (let i = 0; i < ctxBefore.length; i++) {
        if (lines[startPos + i] !== ctxBefore[i]) {
          match = false;
          break;
        }
      }
      if (!match) continue;

      for (let i = 0; i < removed.length; i++) {
        if (lines[startPos + ctxBefore.length + i] !== removed[i]) {
          match = false;
          break;
        }
      }

      if (match) return startPos;
    }
  }

  return -1;
}

module.exports = { apply };
