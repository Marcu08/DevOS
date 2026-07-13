module.exports = function test(assert) {
  const security = require("../agent/security/index");
  const secrets = require("../agent/security/secrets");
  const deps = require("../agent/security/dependencies");
  const patterns = require("../agent/security/patterns");
  const perms = require("../agent/security/permissions");
  const vulns = require("../agent/security/vulnerabilities");

  // Secrets scanner
  const secretFindings = secrets.scan("test.js", 'const API_KEY = "sk-12345678901234567890";');
  assert.ok(secretFindings.length > 0, "should detect API key");
  assert.ok(secretFindings.some(f => f.severity === "critical"), "API key should be critical");

  const noFindings = secrets.scan("test.js", 'const x = 42;');
  assert.equal(noFindings.length, 0, "should not flag safe code");

  const pwFindings = secrets.scan("config.js", 'password = "supersecret123"');
  assert.ok(pwFindings.length > 0, "should detect password");

  const ghFindings = secrets.scan("env.js", 'token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"');
  assert.ok(ghFindings.some(f => f.label.includes("GitHub")), "should detect GitHub token");

  const pkFindings = secrets.scan("key.pem", "-----BEGIN RSA PRIVATE KEY-----");
  assert.ok(pkFindings.some(f => f.label.includes("Private key")), "should detect private key");

  // Patterns scanner
  const evalFindings = patterns.scan("app.js", 'eval("console.log(1)");');
  assert.ok(evalFindings.length > 0, "should detect eval");
  assert.ok(evalFindings.some(f => f.severity === "high"), "eval should be high severity");

  const innerHTMLFindings = patterns.scan("ui.js", 'element.innerHTML = "<p>test</p>";');
  assert.ok(innerHTMLFindings.length > 0, "should detect innerHTML");
  assert.ok(innerHTMLFindings.some(f => f.severity === "medium"), "innerHTML should be medium");

  const safeFindings = patterns.scan("safe.js", 'const x = 1 + 2;');
  assert.equal(safeFindings.length, 0, "should notflag safe code");

  // Vulnerability scanner
  const debugFindings = vulns.scan("server.js", 'debug("password:", userPassword);');
  assert.ok(debugFindings.some(f => f.severity === "medium"), "should detect debug logging");

  const nullFindings = vulns.scan("check.js", 'if (x == null) return;');
  assert.ok(nullFindings.some(f => f.label.includes("null comparison")), "should detect loose null");

  // Permissions scanner
  const gitignoreFindings = perms.checkGitignore(__dirname + "/..");
  assert.ok(Array.isArray(gitignoreFindings), "should check gitignore");

  // Dependency scanner
  const depRefs = deps.scanReferences({ dependencyMap: { "app.js": ["require('child_process')"] } });
  assert.ok(depRefs.some(f => f.severity === "medium"), "should detect unsafe references");

  // Full scan via index
  const ctx = {
    topFiles: [
      { file: "safe.js", content: "const x = 1;" },
      { file: "secret.js", content: 'const API_KEY = "sk-abcdefghijklmnopqrstuvwxyz";' },
    ],
    dependencyMap: {},
  };
  const result = security.scanAll(ctx);
  assert.ok(typeof result.summary.total === "number", "scan should return total count");
  assert.ok(result.summary.critical >= 0, "scan should count critical");
  assert.ok(result.byCategory.secrets >= 0, "scan should categorize by type");

  // Decision logic
  const passDecision = security.getDecision({ summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } });
  assert.equal(passDecision, "PASS", "no issues should be PASS");

  const retryDecision = security.getDecision({ summary: { critical: 0, high: 2, medium: 0, low: 0, info: 0 } });
  assert.equal(retryDecision, "RETRY", "high issues should be RETRY");

  const rollbackDecision = security.getDecision({ summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 } });
  assert.equal(rollbackDecision, "ROLLBACK", "critical issues should be ROLLBACK");
};
