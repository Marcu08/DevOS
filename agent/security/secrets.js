const PATTERNS = [
  { re: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"][^'"]{4,}['"]/i, severity: "critical", label: "API key or secret" },
  { re: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i, severity: "critical", label: "Password hardcoded" },
  { re: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-\.]{8,}['"]/i, severity: "critical", label: "Secret or token" },
  { re: /(?:sk-[a-zA-Z0-9]{20,45})/, severity: "critical", label: "OpenAI API key" },
  { re: /(?:ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36}/, severity: "critical", label: "GitHub token" },
  { re: /(?:AKIA[0-9A-Z]{16})/, severity: "critical", label: "AWS access key" },
  { re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, severity: "critical", label: "Private key" },
  { re: /(?:mongodb|postgres|mysql|redis):\/\/[^@\s]+@/i, severity: "high", label: "Database connection string with credentials" },
  { re: /(?:auth|secret|key|cert)[\s\/\\\w]*\.(?:json|pem|key|crt|p12)/i, severity: "high", label: "Sensitive file reference" },
];

function scan(filename, content) {
  const findings = [];
  if (!content || typeof content !== "string") return findings;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const p of PATTERNS) {
      if (p.re.test(lines[i])) {
        findings.push({
          file: filename,
          line: i + 1,
          severity: p.severity,
          label: p.label,
          snippet: lines[i].trim().slice(0, 100),
        });
      }
    }
  }
  return findings;
}

module.exports = { scan, PATTERNS };
