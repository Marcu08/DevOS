function rule(id, re, severity, label, remediation) {
  return { id, re, severity, label, remediation };
}

const RULES = [
  rule("patterns.eval", /\beval\s*\(/, "high", "Dynamic code execution (eval)", "Avoid eval; use a safe parser or an explicit command dispatcher."),
  rule("patterns.exec", /\bexec\s*\(/, "high", "Command execution (exec)", "Avoid shell execution; use execFile/spawn with fixed arguments and validate input."),
  rule("patterns.exec-sync", /\bexecSync\s*\(/, "high", "Synchronous command execution", "Prefer execFile/spawn with an argument array and validate all input."),
  rule("patterns.spawn", /\bspawn\s*\(/, "medium", "Child process spawn", "Use fixed commands and an argument array; never interpolate untrusted input."),
  rule("patterns.inner-html", /innerHTML\s*=/, "medium", "Unsafe innerHTML assignment", "Use textContent or a sanitizer before assigning HTML."),
  rule("patterns.outer-html", /outerHTML\s*=/, "medium", "Unsafe outerHTML assignment", "Use DOM APIs or sanitize the HTML before assignment."),
  rule("patterns.document-write", /document\.write\s*\(/, "medium", "document.write usage", "Build DOM nodes or use a safe rendering framework."),
  rule("patterns.local-storage-secret", /\blocalStorage\s*\.\s*setItem\s*\(\s*['"](?:token|secret|key|password)/i, "medium", "Sensitive data in localStorage", "Do not store secrets in localStorage; use an HttpOnly secure cookie."),
  rule("patterns.session-storage-secret", /\bsessionStorage\s*\.\s*setItem\s*\(\s*['"](?:token|secret|key|password)/i, "medium", "Sensitive data in sessionStorage", "Do not store secrets in sessionStorage; use an HttpOnly secure cookie."),
  rule("patterns.function-constructor", /new\s+Function\s*\(/, "high", "Dynamic function constructor", "Avoid dynamic function creation; use explicit code paths."),
  rule("patterns.set-timeout-string", /setTimeout\s*\(\s*['"]/, "medium", "setTimeout with string argument", "Pass a function to setTimeout, never a string."),
  rule("patterns.set-interval-string", /setInterval\s*\(\s*['"]/, "medium", "setInterval with string argument", "Pass a function to setInterval, never a string."),
  rule("patterns.relative-path-traversal", /(?:require|import)\s*\(\s*['"](?:\.\.\/)+/, "low", "Relative path traversal", "Resolve paths against a trusted root and validate the result."),
  rule("patterns.env-access", /process\.env\.(?!(?:NODE_|PATH))/i, "low", "Environment variable access", "Validate environment values and keep secrets out of logs."),
  rule("patterns.fs-write", /fs\.(?:writeFile|appendFile|unlink|rm|rmdir)\s*\(/, "medium", "Filesystem write/delete operation", "Validate paths and restrict operations to intended directories."),
  rule("patterns.crypto", /crypto\.(?:randomBytes|randomFill|createHash)\s*\(/, "info", "Cryptographic operation", "Use current algorithms and a secure source of randomness."),
  rule("patterns.db-query", /sqlite3|mysql|pg\s*\.\s*(?:query|execute)\s*\(/, "medium", "Database query execution", "Use parameterized queries and least-privilege database users."),
  rule("patterns.sql-concat", /\+\s*(?:req\.query|req\.body|req\.params)/, "high", "Potential SQL injection via string concatenation", "Use parameterized queries; never concatenate request input into SQL."),
  rule("patterns.jquery-html", /\.html\s*\(\s*[^)]*\)/, "medium", "jQuery html() with dynamic content", "Sanitize the content or use text() instead."),
  rule("patterns.jquery-append", /\.append\s*\(\s*[^)]*\)/, "low", "jQuery append with dynamic content", "Sanitize the content or build text nodes explicitly."),
];

function scan(filename, content) {
  const findings = [];
  if (!content || typeof content !== "string") return findings;

  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index++) {
    for (const rule of RULES) {
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

module.exports = { scan, RULES };
