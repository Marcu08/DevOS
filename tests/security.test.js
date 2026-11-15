module.exports = function test(assert) {
  const security = require("../agent/security/index");
  const secrets = require("../agent/security/secrets");
  const deps = require("../agent/security/dependencies");
  const patterns = require("../agent/security/patterns");
  const perms = require("../agent/security/permissions");
  const vulns = require("../agent/security/vulnerabilities");

  // Secrets scanner
  const syntheticOpenAiKey = "sk-" + "1".repeat(24);
  const openAiSource = "const " + "API_KEY" + " = " + JSON.stringify(syntheticOpenAiKey) + ";";
  const secretFindings = secrets.scan("test.js", openAiSource);
  assert.ok(secretFindings.length > 0, "should detect API key");
  assert.ok(secretFindings.some(f => f.severity === "critical"), "API key should be critical");
  assert.ok(secretFindings.some(f => f.id && f.remediation), "secret findings should be structured");

  const noFindings = secrets.scan("test.js", 'const x = 42;');
  assert.equal(noFindings.length, 0, "should not flag safe code");

  const passwordSource = "pass" + "word = " + JSON.stringify("supersecret123");
  const pwFindings = secrets.scan("config.js", passwordSource);
  assert.ok(pwFindings.length > 0, "should detect password");

  const syntheticGithubToken = "ghp_" + "a".repeat(36);
  const tokenSource = "tok" + "en = " + JSON.stringify(syntheticGithubToken);
  const ghFindings = secrets.scan("env.js", tokenSource);
  assert.ok(ghFindings.some(f => f.label.includes("GitHub")), "should detect GitHub token");

  const privateKeyMarker = "-----BEGIN " + "RSA PRIVATE KEY-----";
  const keyFile = "key" + ".pem";
  const pkFindings = secrets.scan(keyFile, privateKeyMarker);
  assert.ok(pkFindings.some(f => f.label.includes("Private key")), "should detect private key");
  assert.ok(secretFindings.every(f => !Object.prototype.hasOwnProperty.call(f, "snippet")), "secret findings should not include snippets");

  // Patterns scanner
  const evalFindings = patterns.scan("app.js", "ev" + "al(\"console.log(1)\");");
  assert.ok(evalFindings.length > 0, "should detect eval");
  assert.ok(evalFindings.some(f => f.severity === "high"), "eval should be high severity");

  const innerHTMLFindings = patterns.scan("ui.js", 'element.innerHTML = "<p>test</p>";');
  assert.ok(innerHTMLFindings.length > 0, "should detect innerHTML");
  assert.ok(innerHTMLFindings.some(f => f.severity === "medium"), "innerHTML should be medium");

  const safeFindings = patterns.scan("safe.js", 'const x = 1 + 2;');
  assert.equal(safeFindings.length, 0, "should notflag safe code");

  // Vulnerability scanner
  const debugSource = "deb" + "ug(" + JSON.stringify("pass" + "word:") + ", userPassword);";
  const debugFindings = vulns.scan("server.js", debugSource);
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
      { file: "secret.js", content: openAiSource },
    ],
    dependencyMap: {},
  };
  const result = security.scanAll(ctx);
  assert.equal(result.ok, true, "a readable project should complete the scan");
  assert.ok(result.filesScanned > 0, "scan should report scanned source files");
  assert.ok(typeof result.summary.total === "number", "scan should return total count");
  assert.ok(result.summary.critical >= 0, "scan should count critical");
  assert.ok(result.byCategory.secrets >= 0, "scan should categorize by type");
  assert.ok(result.findings.every(f => f.id && f.remediation), "findings should include id and remediation");
  assert.ok(!result.findings.some(f => f.file === "secret.js"), "scanner must not trust context content");
  assert.equal(result.criticalCount, result.summary.critical, "criticalCount should mirror the summary");
  assert.equal(result.totalFindings, result.summary.total, "totalFindings should mirror the summary");

  // Decision logic
  const passDecision = security.getDecision({ summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } });
  assert.equal(passDecision, "PASS", "no issues should be PASS");

  const retryDecision = security.getDecision({ summary: { critical: 0, high: 2, medium: 0, low: 0, info: 0 } });
  assert.equal(retryDecision, "RETRY", "high issues should be RETRY");

  const rollbackDecision = security.getDecision({ summary: { critical: 1, high: 0, medium: 0, low: 0, info: 0 } });
  assert.equal(rollbackDecision, "ROLLBACK", "critical issues should be ROLLBACK");

  const errorDecision = security.getDecision({ ok: false, summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } });
  assert.equal(errorDecision, "ERROR", "incomplete scans should be ERROR");
};
