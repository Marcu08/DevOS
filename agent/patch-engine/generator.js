const CONTEXT_LINES = 3;

function computeDiff(oldLines, newLines) {
  const changes = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      let j = i;
      const removed = [];
      const added = [];

      while (j < maxLen && oldLines[j] !== newLines[j]) {
        if (j < oldLines.length && oldLines[j] !== newLines[j]) {
          removed.push(oldLines[j]);
        }
        if (j < newLines.length && newLines[j] !== oldLines[j]) {
          added.push(newLines[j]);
        }
        j++;
      }

      changes.push({
        oldStart: i + 1,
        oldCount: removed.length,
        newStart: i + 1,
        newCount: added.length,
        removed,
        added,
      });

      i = j - 1;
    }
  }

  return changes;
}

function generateHunk(change, oldLines, newLines) {
  const ctxBefore = [];
  const start = Math.max(0, change.oldStart - CONTEXT_LINES - 1);

  for (let i = start; i < change.oldStart - 1; i++) {
    if (i < oldLines.length) ctxBefore.push(" " + oldLines[i]);
  }

  const ctxAfter = [];
  const afterEnd = Math.min(oldLines.length, change.oldStart - 1 + change.oldCount + CONTEXT_LINES);

  for (let i = change.oldStart - 1 + change.oldCount; i < afterEnd; i++) {
    if (i < oldLines.length) ctxAfter.push(" " + oldLines[i]);
  }

  const header = `@@ -${change.oldStart},${change.oldCount} +${change.newStart},${change.newCount} @@`;

  const body = [];
  body.push(...ctxBefore);
  for (const l of change.removed) body.push("-" + l);
  for (const l of change.added) body.push("+" + l);
  body.push(...ctxAfter);

  return { header, body };
}

function generate(oldContent, newContent) {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const changes = computeDiff(oldLines, newLines);
  const hunks = changes.map(c => generateHunk(c, oldLines, newLines));

  const result = [];
  for (const h of hunks) {
    result.push(h.header);
    result.push(...h.body);
  }

  return result.join("\n");
}

module.exports = { generate };
