function applyUnifiedDiff(original, diff) {
  const lines = original.split("\n");
  const diffLines = diff.split("\n");

  const result = [...lines];

  let targetIdx = 0;

  for (const line of diffLines) {
    if (line.startsWith("@@")) {
      continue;
    }

    if (line.startsWith("-")) {
      const content = line.slice(1);
      const idx = result.indexOf(content);
      if (idx !== -1) {
        result.splice(idx, 1);
        if (idx < targetIdx) targetIdx--;
      }
    }

    if (line.startsWith("+")) {
      result.splice(targetIdx, 0, line.slice(1));
      targetIdx++;
    }

    targetIdx++;
  }

  return result.join("\n");
}

module.exports = { applyUnifiedDiff };
