function rule(id, re, severity, label, remediation) {
  return { id, re, severity, label, remediation };
}

const COMMON = [
  rule("vulnerabilities.debug-sensitive", /\bdebug\b.*\b(?:password|token|secret|key)\b/i, "medium", "Potential debug logging of sensitive data", "Remove sensitive values from debug output and use structured redaction."),
  rule("vulnerabilities.error-logging", /catch\s*\(.*\)\s*\{[^}]*\bconsole\.(?:log|error|dir)\b[^}]*\}/i, "low", "Error logging may expose internals", "Log a sanitized error code and correlation id instead of raw internals."),
  rule("vulnerabilities.env-usage", /\.env(?:\s*\)|\s*\]|\s*,)/, "low", "Environment variable usage", "Validate environment values and avoid logging them."),
  rule("vulnerabilities.code-marker", /(?:TODO|FIXME|HACK|XXX|BUG|WORKAROUND)/, "info", "Code quality marker", "Resolve or track the marker before release."),
  rule("vulnerabilities.console-log", /(?:console\.log|console\.error|console\.warn)\s*\([^)]*$/, "low", "Console logging in production code", "Use the project logger and avoid logging sensitive values."),
  rule("vulnerabilities.empty-catch", /try\s*\{[^}]*\}\s*catch\s*\(\s*\)\s*\{\s*\}/, "medium", "Empty catch block — swallows errors", "Handle or rethrow the error; never swallow it silently."),
  rule("vulnerabilities.default-sort", /\.sort\s*\(\s*\)/, "info", "Default sort (lexicographic, not numeric)", "Provide a comparator when sorting numbers or objects."),
  rule("vulnerabilities.loose-null", /==\s*null/, "low", "Loose null comparison", "Use strict equality (=== null or === undefined)."),
  rule("vulnerabilities.loose-not-null", /!=\s*null/, "low", "Loose null comparison", "Use strict inequality (!== null or !== undefined)."),
  rule("vulnerabilities.var", /var\s+/, "low", "var usage (consider let/const)", "Use let or const for block scoping."),
];

function scan(filename, content) {
  const findings = [];
  if (!content || typeof content !== "string") return findings;

  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index++) {
    for (const rule of COMMON) {
      if (rule.re.test(lines[index])) {
        findings.push({
          id: rule.id,
          severity: rule.severity,
          file: filename,
          line: index + 1,
          label: rule.label,
          message: rule.label,
          remediation: rule.remediation,
        });
        break;
      }
    }
  }

  return findings;
}

module.exports = { scan, COMMON };
