function parse(diff) {
  if (!diff || !diff.trim()) return [];

  const hunks = [];
  const lines = diff.split("\n");
  let current = null;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");

    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);

    if (hunkMatch) {
      if (current) hunks.push(current);
      current = {
        oldStart: parseInt(hunkMatch[1]),
        oldCount: parseInt(hunkMatch[2] || "1"),
        newStart: parseInt(hunkMatch[3]),
        newCount: parseInt(hunkMatch[4] || "1"),
        context: hunkMatch[5].trim(),
        lines: [],
        removed: 0,
        added: 0,
      };
      continue;
    }

    if (!current) continue;

    current.lines.push(line);

    if (line.startsWith("-")) current.removed++;
    else if (line.startsWith("+")) current.added++;
  }

  if (current) hunks.push(current);
  return hunks;
}

module.exports = { parse };
