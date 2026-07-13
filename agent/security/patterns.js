const RULES = [
  { re: /\beval\s*\(/, severity: "high", label: "Dynamic code execution (eval)" },
  { re: /\bexec\s*\(/, severity: "high", label: "Command execution (exec)" },
  { re: /\bexecSync\s*\(/, severity: "high", label: "Synchronous command execution" },
  { re: /\bspawn\s*\(/, severity: "medium", label: "Child process spawn" },
  { re: /innerHTML\s*=/, severity: "medium", label: "Unsafe innerHTML assignment" },
  { re: /outerHTML\s*=/, severity: "medium", label: "Unsafe outerHTML assignment" },
  { re: /document\.write\s*\(/, severity: "medium", label: "document.write usage" },
  { re: /\blocalStorage\s*\.\s*setItem\s*\(\s*['"](?:token|secret|key|password)/i, severity: "medium", label: "Sensitive data in localStorage" },
  { re: /\bsessionStorage\s*\.\s*setItem\s*\(\s*['"](?:token|secret|key|password)/i, severity: "medium", label: "Sensitive data in sessionStorage" },
  { re: /new\s+Function\s*\(/, severity: "high", label: "Dynamic function constructor" },
  { re: /setTimeout\s*\(\s*['"]/, severity: "medium", label: "setTimeout with string argument" },
  { re: /setInterval\s*\(\s*['"]/, severity: "medium", label: "setInterval with string argument" },
  { re: /(?:require|import)\s*\(\s*['"](?:\.\.\/)+/, severity: "low", label: "Relative path traversal" },
  { re: /process\.env\.(?!(?:NODE_|PATH))/i, severity: "low", label: "Environment variable access" },
  { re: /fs\.(?:writeFile|appendFile|unlink|rm|rmdir)\s*\(/, severity: "medium", label: "Filesystem write/delete operation" },
  { re: /crypto\.(?:randomBytes|randomFill|createHash)\s*\(/, severity: "info", label: "Cryptographic operation" },
  { re: /sqlite3|mysql|pg\s*\.\s*(?:query|execute)\s*\(/, severity: "medium", label: "Database query execution" },
  { re: /\+\s*(?:req\.query|req\.body|req\.params)/, severity: "high", label: "Potential SQL injection via string concatenation" },
  { re: /\.html\s*\(\s*[^)]*\)/, severity: "medium", label: "jQuery html() with dynamic content" },
  { re: /\.append\s*\(\s*[^)]*\)/, severity: "low", label: "jQuery append with dynamic content" },
];

function scan(filename, content) {
  const findings = [];
  if (!content || typeof content !== "string") return findings;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const rule of RULES) {
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

module.exports = { scan, RULES };
