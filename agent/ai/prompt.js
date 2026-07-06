function buildPrompt(task, context, errors) {
  const lines = [];
  lines.push("# DevOS Agent Task");
  lines.push("");
  lines.push(`## Task\n${task}`);
  lines.push("");

  const top = context.topFiles || [];
  if (top.length > 0) {
    lines.push("## Relevant Files");
    lines.push("");

    for (const f of top.slice(0, 5)) {
      lines.push(`### ${f.file}`);
      lines.push(`- Language: ${f.language}`);
      lines.push(`- Score: ${f.score}`);
      lines.push(`- Lines: ${f.complexity?.lines || 0}`);
      lines.push(`- Functions: ${f.complexity?.functions || 0}`);
      lines.push("");
    }
  }

  const depMap = context.dependencyMap || {};
  const depKeys = Object.keys(depMap);
  if (depKeys.length > 0) {
    lines.push("## Dependency Map");
    for (const k of depKeys.slice(0, 10)) {
      const deps = depMap[k];
      if (deps.length > 0) lines.push(`- ${k} → ${deps.join(", ")}`);
    }
    lines.push("");
  }

  if (errors && errors.length > 0) {
    lines.push("## Previous Errors (Retry)");
    for (const e of errors) {
      lines.push(`- ${e.name}: ${e.error}`);
    }
    lines.push("");
  }

  lines.push("## Output Instructions");
  lines.push("Generate a JSON patch with the following structure:");
  lines.push('{ "title": "...", "summary": "...", "risk": "low|medium|high", "files": [{ "path": "...", "patch": "...unified diff...", "reason": "..." }] }');
  lines.push("Only include files that need changes. Use unified diff format for patches.");
  lines.push("Respond with valid JSON only.");

  return lines.join("\n");
}

module.exports = { buildPrompt };
