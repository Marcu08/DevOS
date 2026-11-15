const secrets = require("./secrets");
const patterns = require("./patterns");
const vulnerabilities = require("./vulnerabilities");

const SUPPORTED_SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

const DEFAULT_METADATA = {
  label: "Security finding",
  remediation: "Review the finding and remediate it before release.",
};

const EXTRA_METADATA = {
  "dependencies.unsafe-package": {
    label: "Unsafe dependency",
    remediation: "Remove or isolate the unsafe dependency and use a safer alternative.",
  },
  "dependencies.loose-version": {
    label: "Loose dependency version constraint",
    remediation: "Pin dependencies or use a bounded semver range.",
  },
  "dependencies.unsafe-script": {
    label: "Unsafe package script",
    remediation: "Avoid destructive or network-piped shell commands in package scripts.",
  },
  "dependencies.unsafe-reference": {
    label: "Unsafe dependency reference",
    remediation: "Verify the dependency is necessary and isolate privileged operations.",
  },
  "permissions.env-file": {
    label: "Environment file should be in .gitignore",
    remediation: "Remove the environment file from version control and keep it gitignored.",
  },
  "permissions.credentials-file": {
    label: "Credentials file detected - should not be committed",
    remediation: "Remove the credentials file, rotate the credentials, and load them from a secret manager.",
  },
  "permissions.debug-log": {
    label: "Debug log file",
    remediation: "Remove generated debug logs and add them to .gitignore.",
  },
  "permissions.certificate-key": {
    label: "Certificate or key file detected",
    remediation: "Remove the key material from the repository and store it in a secret manager.",
  },
  "permissions.no-gitignore": {
    label: "No .gitignore file found",
    remediation: "Add a .gitignore that excludes secrets, dependencies, and generated files.",
  },
  "permissions.gitignore-missing-entry": {
    label: "Missing .gitignore entry",
    remediation: "Add the recommended entry to .gitignore (or confirm it is intentionally tracked).",
  },
};

const STATIC_FINDING_METADATA = new Map();

for (const rule of [...secrets.PATTERNS, ...patterns.RULES, ...vulnerabilities.COMMON]) {
  if (rule.id) {
    STATIC_FINDING_METADATA.set(rule.id, {
      label: rule.label,
      remediation: rule.remediation,
    });
  }
}

for (const [id, metadata] of Object.entries(EXTRA_METADATA)) {
  STATIC_FINDING_METADATA.set(id, metadata);
}

function getFindingMetadata(id) {
  return STATIC_FINDING_METADATA.get(id) || DEFAULT_METADATA;
}

module.exports = {
  DEFAULT_METADATA,
  STATIC_FINDING_METADATA,
  SUPPORTED_SEVERITIES,
  getFindingMetadata,
};
