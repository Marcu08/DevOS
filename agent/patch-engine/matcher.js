function findContext(lines, hunk, startPos) {
  const contextLines = hunk.lines.filter(l => !l.startsWith("-") && !l.startsWith("+"));
  if (contextLines.length === 0) return startPos;

  const firstContext = contextLines[0].replace(/^ /, "");

  for (let i = startPos; i < lines.length; i++) {
    if (lines[i].trim() === firstContext.trim()) {
      let match = true;
      let ci = i;
      for (const hl of contextLines) {
        const expected = hl.replace(/^ /, "").trim();
        if (ci >= lines.length || lines[ci].trim() !== expected) {
          match = false;
          break;
        }
        ci++;
      }
      if (match) return i;
    }
  }

  return -1;
}

module.exports = { findContext };
