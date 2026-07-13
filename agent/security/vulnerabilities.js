const fs = require("fs");
const path = require("path");

const COMMON = [
  { re: /\bdebug\b.*\b(?:password|token|secret|key)\b/i, severity: "medium", label: "Potential debug logging of sensitive data" },
  { re: /catch\s*\(.*\)\s*\{[^}]*\bconsole\.(?:log|error|dir)\b[^}]*\}/i, severity: "low", label: "Error logging may expose internals" },
  { re: /\.env(?:\s*\)|\s*\]|\s*,)/, severity: "low", label: "Environment variable usage" },
  { re: /(?:TODO|FIXME|HACK|XXX|BUG|WORKAROUND)/, severity: "info", label: "Code quality marker" },
  { re: /(?:console\.log|console\.error|console\.warn)\s*\([^)]*$/, severity: "low", label: "Console logging in production code" },
  { re: /try\s*\{[^}]*\}\s*catch\s*\(\s*\)\s*\{\s*\}/, severity: "medium", label: "Empty catch block — swallows errors" },
  { re: /\.sort\s*\(\s*\)/, severity: "info", label: "Default sort (lexicographic, not numeric)" },
  { re: /==\s*null/, severity: "low", label: "Loose null comparison" },
  { re: /!=\s*null/, severity: "low", label: "Loose null comparison" },
  { re: /var\s+/, severity: "low", label: "var usage (consider let/const)" },
];

function scan(filename, content) {
  const findings = [];
  if (!content || typeof content !== "string") return findings;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const rule of COMMON) {
      if (rule.re.test(lines[i])) {
        findings.push({
          file: filename,
          line: i + 1,
          severity: rule.severity,
          label: rule.label,
          snippet: lines[i].trim().slice(0, 100),
        });
        break;
      }
    }
  }
  return findings;
}

module.exports = { scan, COMMON };
