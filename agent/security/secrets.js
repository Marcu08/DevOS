const PATTERNS = [
  {
    id: "secrets.api-key",
    re: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    severity: "critical",
    label: "API key or secret",
    remediation: "Remove the hardcoded credential and load it from an environment variable or secret manager; rotate the exposed value.",
  },
  {
    id: "secrets.password",
    re: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    severity: "critical",
    label: "Password hardcoded",
    remediation: "Remove the hardcoded password and load it from a secret manager or environment variable; rotate it.",
  },
  {
    id: "secrets.token",
    re: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-\.]{8,}['"]/i,
    severity: "critical",
    label: "Secret or token",
    remediation: "Move the token to a secret manager or environment variable and rotate it.",
  },
  {
    id: "secrets.openai-key",
    re: /(?:sk-[a-zA-Z0-9]{20,45})/,
    severity: "critical",
    label: "OpenAI API key",
    remediation: "Revoke the exposed key, rotate it, and load the replacement from a secret manager.",
  },
  {
    id: "secrets.github-token",
    re: /(?:ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36}/,
    severity: "critical",
    label: "GitHub token",
    remediation: "Revoke the token in GitHub settings, rotate it, and store it in a secret manager.",
  },
  {
    id: "secrets.aws-access-key",
    re: /(?:AKIA[0-9A-Z]{16})/,
    severity: "critical",
    label: "AWS access key",
    remediation: "Disable the exposed AWS access key, rotate it, and use an IAM role or secret manager.",
  },
  {
    id: "secrets.private-key",
    re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
    severity: "critical",
    label: "Private key",
    remediation: "Remove the private key from the repository, rotate the key pair, and store the private key securely.",
  },
  {
    id: "secrets.database-uri",
    re: /(?:mongodb|postgres|mysql|redis):\/\/[^@\s]+@/i,
    severity: "high",
    label: "Database connection string with credentials",
    remediation: "Move database credentials to a secret manager and rotate them.",
  },
  {
    id: "secrets.sensitive-file-reference",
    re: /(?:auth|secret|key|cert)[\s\/\\\w]*\.(?:json|pem|key|crt|p12)/i,
    severity: "high",
    label: "Sensitive file reference",
    remediation: "Verify that the referenced credential file is not committed and load secrets at runtime.",
  },
];

function scan(filename, content) {
  const findings = [];
  if (!content || typeof content !== "string") return findings;

  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index++) {
    for (const pattern of PATTERNS) {
      if (pattern.re.test(lines[index])) {
        findings.push({
          id: pattern.id,
          severity: pattern.severity,
          file: filename,
          line: index + 1,
          label: pattern.label,
          message: pattern.label,
          remediation: pattern.remediation,
        });
      }
    }
  }

  return findings;
}

module.exports = { scan, PATTERNS };
