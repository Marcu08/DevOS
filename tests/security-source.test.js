module.exports = function test(assert) {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const security = require("../agent/security/index");
  const files = require("../agent/security/files");

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "devos-security-"));
  const root = path.join(temp, "project");
  const src = path.join(root, "src");

  function write(file, content) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    return target;
  }

  try {
    fs.mkdirSync(src, { recursive: true });
    write(".gitignore", ".env\n.env.local\nnode_modules/\ncredentials.json\n*.pem\n*.key\n*.log\n");

    // Build synthetic secrets at runtime so this test file never contains a
    // credential-shaped literal of its own.
    const syntheticKey = "sk-" + "a".repeat(28);
    const secretContent = "const " + "API_KEY" + " = " + JSON.stringify(syntheticKey) + ";\n";
    const envKey = "test-api-key-" + "a".repeat(12);
    const envToken = "ghp_" + "b".repeat(36);
    const envApiKeyLine = "API_KEY" + "=" + JSON.stringify(envKey) + "\n";
    const envTokenLine = "GITHUB_TOKEN" + "=" + JSON.stringify(envToken) + "\n";
    write(".env", envApiKeyLine);
    write(".env.local", envTokenLine);
    write(".env.example", "API_KEY=replace-with-your-key\nGITHUB_TOKEN=replace-with-your-token\n");

    const pkgPrivateValue = "synthetic-package-secret-" + "p".repeat(12);
    const packageDependency = "synth-dep-" + pkgPrivateValue;
    const packageScript = "synth-script-" + pkgPrivateValue;
    write("package.json", JSON.stringify({
      dependencies: { [packageDependency]: "*" },
      scripts: { [packageScript]: "rm -rf /" },
    }, null, 2));
    const unsafeContent = "ev" + "al(\"1 + 1\");\n";
    write("src/secret.js", secretContent);
    write("src/unsafe.js", unsafeContent);
    write("src/empty.js", "");
    write("src/large.js", "x".repeat(500));
    write("src/binary.bin", Buffer.from([0, 1, 2, 3, 4, 5]));
    const unreadablePath = write("src/unreadable.js", "const x = 1;\n");
    write("node_modules/secret.js", secretContent);
    write("logs/secret.js", secretContent);
    write("custom/secret.js", secretContent);

    // Legitimate nested source directories named repo/workspace must be scanned.
    write("src/repo/legit.js", unsafeContent);
    write("src/workspace/legit.js", unsafeContent);
    write("repo/legit.js", unsafeContent);
    write("workspace/legit.js", unsafeContent);

    // Nested configured workspace: only its subtree should be excluded.
    write("src/sibling.js", secretContent);
    write("src/devos-workspace/secret.js", secretContent);
    write("src/devos-workspace/credentials.json", "{}");
    write("src/devos-workspace-other/secret.js", secretContent);
    write("src/nested/devos-workspace/secret.js", secretContent);

    // Generated directories must remain excluded.
    write("dist/generated.js", secretContent);

    // Symlinks must not be followed. Some Windows setups require Developer
    // Mode for symlink creation, so these assertions are conditional.
    let symlinkCreated = false;
    try {
      fs.symlinkSync(path.join(src, "secret.js"), path.join(src, "secret-link.js"));
      symlinkCreated = true;
    } catch {
      // Symlink creation is not available in this environment.
    }

    const outsideDirectory = path.join(temp, "outside-directory");
    fs.mkdirSync(outsideDirectory, { recursive: true });
    fs.writeFileSync(path.join(outsideDirectory, "secret.js"), secretContent);

    let directorySymlinkCreated = false;
    try {
      fs.symlinkSync(outsideDirectory, path.join(src, "linked-directory"), "junction");
      directorySymlinkCreated = true;
    } catch {
      try {
        fs.symlinkSync(outsideDirectory, path.join(src, "linked-directory"), "dir");
        directorySymlinkCreated = true;
      } catch {
        // Directory symlink creation is not available in this environment.
      }
    }

    let rootSymlinkCreated = false;
    try {
      fs.symlinkSync(root, path.join(temp, "linked-root"), "junction");
      rootSymlinkCreated = true;
    } catch {
      try {
        fs.symlinkSync(root, path.join(temp, "linked-root"), "dir");
        rootSymlinkCreated = true;
      } catch {
        // Root symlink creation is not available in this environment.
      }
    }

    const baseOptions = {
      root,
      maxFileSizeBytes: 120,
      exclude: ["custom"],
    };

    const agent = require("../agents/security-agent");

    const injectedReader = () => {
      const error = new Error("EACCES: permission denied");
      error.code = "EACCES";
      throw error;
    };

    const injectedUnreadable = files.readSourceFile(unreadablePath, { readFile: injectedReader });
    assert.ok(
      injectedUnreadable.error.includes("file could not be read"),
      "injected readers should remain isolated to direct readSourceFile tests with redacted errors"
    );

    // scanAll must ignore reader/hook injection and use the production safe-open
    // path. If any of these options are forwarded, the scan either fails or the
    // hook flags become true.
    let injectedReaderCalled = false;
    let descriptorHookCalled = false;
    let beforeReadHookCalled = false;
    const scanWithIgnoredOptions = security.scanAll({}, {
      ...baseOptions,
      readFile: () => {
        injectedReaderCalled = true;
        throw new Error("scanAll must not use readFile");
      },
      onDescriptorOpened: () => { descriptorHookCalled = true; },
      beforeRead: () => { beforeReadHookCalled = true; },
    });
    assert.equal(scanWithIgnoredOptions.ok, true, "scanAll should complete using safe-open reads");
    assert.equal(injectedReaderCalled, false, "scanAll must not activate the injected-reader bypass");
    assert.equal(descriptorHookCalled, false, "scanAll must not forward onDescriptorOpened");
    assert.equal(beforeReadHookCalled, false, "scanAll must not forward beforeRead");
    assert.ok(scanWithIgnoredOptions.filesScanned > 0, "scanAll should scan files through the production path");
    assert.ok(scanWithIgnoredOptions.findings.some((finding) => finding.file === "src/secret.js"), "secret should still be detected");
    assert.ok(scanWithIgnoredOptions.findings.some((finding) => finding.file === "src/unsafe.js"), "unsafe pattern should still be detected");
    assert.ok(!scanWithIgnoredOptions.findings.some((finding) => finding.file.startsWith("node_modules/")), "node_modules should be excluded");
    assert.ok(!scanWithIgnoredOptions.findings.some((finding) => finding.file.startsWith("logs/")), "logs should be excluded");
    assert.ok(!scanWithIgnoredOptions.findings.some((finding) => finding.file.startsWith("custom/")), "configured exclusions should apply");
    assert.ok(scanWithIgnoredOptions.filesSkipped.some((entry) => entry.file === "src/binary.bin"), "binary file should be skipped");
    assert.ok(scanWithIgnoredOptions.filesSkipped.some((entry) => entry.file === "src/large.js"), "oversized file should be skipped");

    if (symlinkCreated) {
      assert.ok(
        scanWithIgnoredOptions.filesSkipped.some((entry) => entry.file === "src/secret-link.js" && entry.reason === "symlink"),
        "symlinks should be skipped instead of followed"
      );

      const directLink = files.readSourceFile(path.join(src, "secret-link.js"));
      assert.equal(directLink.skipped, true, "readSourceFile should refuse a symlink");
      assert.equal(directLink.reason, "symlink", "readSourceFile should report the symlink reason");
    }

    if (directorySymlinkCreated) {
      assert.ok(
        scanWithIgnoredOptions.filesSkipped.some((entry) => entry.file === "src/linked-directory" && entry.reason === "symlink"),
        "directory symlinks should be skipped during traversal"
      );
    }

    fs.unlinkSync(unreadablePath);

    const originalResultLog = console.log;
    const resultLogs = [];
    console.log = (...args) => { resultLogs.push(args.join(" ")); };
    let result;
    try {
      result = security.scanAll({}, baseOptions);
    } finally {
      console.log = originalResultLog;
    }
    assert.equal(result.ok, true, "a complete scan should be ok");
    assert.equal(result.error, null, "complete scans should not have an error");
    assert.ok(result.filesScanned >= 4, "complete scan should report scanned files");
    assert.ok(result.findings.some((finding) => finding.file === "src/secret.js"), "secret should be detected from source");
    assert.ok(result.findings.some((finding) => finding.id === "patterns.eval"), "eval should be detected from source");
    assert.ok(result.findings.some((finding) => finding.file === "src/empty.js") === false, "empty files should have no findings");

    assert.ok(
      result.findings.some((finding) => finding.file === ".env" && finding.id === "secrets.api-key"),
      "the secrets scanner should inspect .env"
    );
    assert.ok(
      result.findings.some((finding) => finding.file === ".env.local" && finding.id === "secrets.github-token"),
      "the secrets scanner should inspect .env.local"
    );
    assert.ok(
      !result.findings.some((finding) => finding.file === ".env.example" && finding.category === "secrets"),
      ".env.example placeholders should not produce secret findings"
    );
    const serializedResult = JSON.stringify(result);
    assert.ok(!serializedResult.includes(envKey), "raw .env secret must not appear in scan results");
    assert.ok(!serializedResult.includes(envToken), "raw .env.local token must not appear in scan results");

    const packageFindings = result.findings.filter(
      (finding) => finding.file === "package.json" && finding.category === "dependencies"
    );
    assert.ok(
      packageFindings.some((finding) => finding.id === "dependencies.loose-version"),
      "loose dependency constraints should still be detected"
    );
    assert.ok(
      packageFindings.some((finding) => finding.id === "dependencies.unsafe-script"),
      "unsafe package scripts should still be detected"
    );

    const looseFinding = packageFindings.find((finding) => finding.id === "dependencies.loose-version");
    assert.equal(looseFinding.label, "Loose dependency version constraint", "dependency labels must be static");
    assert.equal(
      looseFinding.remediation,
      "Pin dependencies or use a bounded semver range.",
      "dependency remediation must be static"
    );

    const unsafeScriptFinding = packageFindings.find((finding) => finding.id === "dependencies.unsafe-script");
    assert.equal(unsafeScriptFinding.label, "Unsafe package script", "script labels must be static");
    assert.equal(
      unsafeScriptFinding.remediation,
      "Avoid destructive or network-piped shell commands in package scripts.",
      "script remediation must be static"
    );
    assert.ok(!serializedResult.includes(pkgPrivateValue), "package-derived secret must not appear in scan results");
    assert.ok(!resultLogs.join("\n").includes(pkgPrivateValue), "package-derived secret must not appear in logs");

    const dependenciesScanner = require("../agent/security/dependencies");
    const missingManifestRoot = path.join(temp, "missing-manifest");
    fs.mkdirSync(missingManifestRoot, { recursive: true });
    assert.deepEqual(
      dependenciesScanner.scanProject(missingManifestRoot),
      [],
      "a missing package.json should preserve the existing no-op behavior"
    );

    assert.ok(
      Array.isArray(dependenciesScanner.scanProject(root)),
      "a valid package.json should scan normally"
    );

    const malformedManifestRoot = path.join(temp, "malformed-manifest");
    fs.mkdirSync(malformedManifestRoot, { recursive: true });
    fs.writeFileSync(path.join(malformedManifestRoot, "package.json"), "{ invalid json");
    assert.throws(
      () => dependenciesScanner.scanProject(malformedManifestRoot),
      "a malformed package.json should throw"
    );
    try {
      dependenciesScanner.scanProject(malformedManifestRoot);
    } catch (error) {
      assert.ok(error.message.includes("could not be read or parsed"), "manifest errors should be generic");
      assert.ok(!error.message.includes("Unexpected token"), "raw parser errors must not leak");
    }

    for (const [name, content] of [
      ["null", "null"],
      ["array", "[]"],
      ["string", JSON.stringify("manifest")],
      ["number", "42"],
      ["boolean", "true"],
    ]) {
      const invalidRoot = path.join(temp, `invalid-structure-${name}`);
      fs.mkdirSync(invalidRoot, { recursive: true });
      fs.writeFileSync(path.join(invalidRoot, "package.json"), content);

      assert.throws(
        () => dependenciesScanner.scanProject(invalidRoot),
        `a ${name} package manifest should throw`
      );

      try {
        dependenciesScanner.scanProject(invalidRoot);
      } catch (error) {
        assert.ok(error.message.includes("invalid structure"), "invalid manifests should report a generic structure error");
        assert.ok(!error.message.includes("Unexpected token"), "raw parser errors must not leak");
      }
    }

    const nullManifestRoot = path.join(temp, "invalid-structure-null");
    const nullManifestScan = security.scanAll({}, { root: nullManifestRoot });
    assert.equal(nullManifestScan.ok, false, "invalid manifest structure should make the scan incomplete");
    assert.ok(
      nullManifestScan.errors.some(
        (error) => error.scanner === "dependencies" &&
          error.error.includes("Dependency manifest scan failed")
      ),
      "invalid manifest structure should propagate a dependency error"
    );
    assert.equal(security.getDecision(nullManifestScan), "ERROR", "invalid manifest structure should return ERROR");

    const statFailureRoot = path.join(temp, "stat-failure-manifest");
    fs.mkdirSync(statFailureRoot, { recursive: true });
    fs.writeFileSync(path.join(statFailureRoot, "package.json"), "{}");
    const originalLstatSync = fs.lstatSync;
    fs.lstatSync = (file, ...args) => {
      if (typeof file === "string" && file.endsWith("package.json")) {
        const error = new Error("synthetic manifest lstat failure");
        error.code = "EACCES";
        throw error;
      }
      return originalLstatSync(file, ...args);
    };
    try {
      assert.throws(
        () => dependenciesScanner.scanProject(statFailureRoot),
        "an lstat failure should throw"
      );
      try {
        dependenciesScanner.scanProject(statFailureRoot);
      } catch (error) {
        assert.ok(error.message.includes("could not be inspected"), "lstat failures should be generic");
        assert.ok(!error.message.includes("synthetic manifest lstat failure"), "raw lstat errors must not leak");
      }
    } finally {
      fs.lstatSync = originalLstatSync;
    }

    const externalValidManifestDir = path.join(temp, "external-valid-manifest");
    fs.mkdirSync(externalValidManifestDir, { recursive: true });
    fs.writeFileSync(
      path.join(externalValidManifestDir, "package.json"),
      JSON.stringify({ dependencies: { react: "*" } }, null, 2)
    );

    const externalMalformedManifestDir = path.join(temp, "external-malformed-manifest");
    fs.mkdirSync(externalMalformedManifestDir, { recursive: true });
    fs.writeFileSync(path.join(externalMalformedManifestDir, "package.json"), "{ invalid external manifest");

    let manifestSymlinkSkipReason = null;
    function createManifestSymlink(targetDir, linkRoot) {
      fs.mkdirSync(linkRoot, { recursive: true });
      const target = path.join(targetDir, "package.json");
      const link = path.join(linkRoot, "package.json");
      const attempts = process.platform === "win32" ? [["file"], []] : [[], ["file"]];
      const supportedSkipCodes = process.platform === "win32"
        ? new Set(["EPERM", "EACCES", "EINVAL", "ENOSYS", "ENOTSUP", "EOPNOTSUPP"])
        : new Set(["EPERM", "ENOSYS", "ENOTSUP", "EOPNOTSUPP"]);
      let lastError = null;

      for (const args of attempts) {
        try {
          fs.symlinkSync(target, link, ...args);
          return true;
        } catch (error) {
          lastError = error;
          if (!supportedSkipCodes.has(error.code)) {
            throw error;
          }
        }
      }

      manifestSymlinkSkipReason = `${process.platform}:${lastError?.code || "unknown"}`;
      return false;
    }

    const validManifestSymlinkRoot = path.join(temp, "symlink-valid-manifest");
    const malformedManifestSymlinkRoot = path.join(temp, "symlink-malformed-manifest");
    const validManifestSymlinkCreated = createManifestSymlink(externalValidManifestDir, validManifestSymlinkRoot);
    const malformedManifestSymlinkCreated = createManifestSymlink(externalMalformedManifestDir, malformedManifestSymlinkRoot);

    if (validManifestSymlinkCreated) {
      const originalSymlinkRead = fs.readFileSync;
      let symlinkTargetRead = false;
      fs.readFileSync = (file, ...args) => {
        if (typeof file === "string" && file.includes("external-valid-manifest")) {
          symlinkTargetRead = true;
        }
        return originalSymlinkRead(file, ...args);
      };
      try {
        assert.throws(
          () => dependenciesScanner.scanProject(validManifestSymlinkRoot),
          "a symlinked package.json should be rejected"
        );
      } finally {
        fs.readFileSync = originalSymlinkRead;
      }
      assert.equal(symlinkTargetRead, false, "the symlink target must not be read");

      const symlinkScan = security.scanAll({}, { root: validManifestSymlinkRoot });
      assert.equal(symlinkScan.ok, false, "a symlinked manifest should make the scan incomplete");
      assert.ok(
        symlinkScan.errors.some(
          (error) => error.scanner === "dependencies" &&
            error.error.includes("Dependency manifest scan failed")
        ),
        "symlinked manifest should propagate a dependency error"
      );
      assert.equal(security.getDecision(symlinkScan), "ERROR", "symlinked manifest should return ERROR");
    }

    if (malformedManifestSymlinkCreated) {
      const originalMalformedSymlinkRead = fs.readFileSync;
      let malformedSymlinkTargetRead = false;
      fs.readFileSync = (file, ...args) => {
        if (typeof file === "string" && file.includes("external-malformed-manifest")) {
          malformedSymlinkTargetRead = true;
        }
        return originalMalformedSymlinkRead(file, ...args);
      };
      try {
        assert.throws(
          () => dependenciesScanner.scanProject(malformedManifestSymlinkRoot),
          "a symlink to a malformed manifest should still be rejected"
        );
        const malformedSymlinkScan = security.scanAll({}, { root: malformedManifestSymlinkRoot });
        assert.equal(malformedSymlinkScan.ok, false, "malformed symlinked manifest should make the scan incomplete");
        assert.ok(
          malformedSymlinkScan.errors.some(
            (error) => error.scanner === "dependencies" &&
              error.error.includes("Dependency manifest scan failed")
          ),
          "malformed symlinked manifest should propagate a dependency error"
        );
        assert.ok(!JSON.stringify(malformedSymlinkScan).includes("invalid external manifest"), "symlink target contents must not leak");
        assert.equal(security.getDecision(malformedSymlinkScan), "ERROR", "malformed symlink should return ERROR");
      } finally {
        fs.readFileSync = originalMalformedSymlinkRead;
      }
      assert.equal(malformedSymlinkTargetRead, false, "the malformed symlink target must not be read");
    }

    if (!validManifestSymlinkCreated || !malformedManifestSymlinkCreated) {
      console.log(`[skip] package.json symlink tests: file symlink creation unsupported (${manifestSymlinkSkipReason || "unknown"})`);
    }

    const unreadableManifestRoot = path.join(temp, "unreadable-manifest");
    fs.mkdirSync(unreadableManifestRoot, { recursive: true });
    fs.writeFileSync(path.join(unreadableManifestRoot, "package.json"), "{}");
    const originalReadFileSync = fs.readFileSync;
    fs.readFileSync = (file, ...args) => {
      if (typeof file === "string" && file.endsWith("package.json")) {
        throw new Error("synthetic manifest read failure");
      }
      return originalReadFileSync(file, ...args);
    };
    try {
      assert.throws(
        () => dependenciesScanner.scanProject(unreadableManifestRoot),
        "an unreadable package.json should throw"
      );
      try {
        dependenciesScanner.scanProject(unreadableManifestRoot);
      } catch (error) {
        assert.ok(error.message.includes("could not be read or parsed"), "unreadable manifest errors should be generic");
        assert.ok(!error.message.includes("synthetic manifest read failure"), "raw read errors must not leak");
      }
    } finally {
      fs.readFileSync = originalReadFileSync;
    }

    const malformedScan = security.scanAll({}, { root: malformedManifestRoot });
    assert.equal(malformedScan.ok, false, "malformed manifest should make the scan incomplete");
    assert.ok(
      malformedScan.errors.some(
        (error) => error.scanner === "dependencies" &&
          error.error.includes("Dependency manifest scan failed")
      ),
      "malformed manifest should propagate a dependency error"
    );
    assert.equal(security.getDecision(malformedScan), "ERROR", "malformed manifest should return ERROR");
    assert.ok(!JSON.stringify(malformedScan).includes("synthetic manifest read failure"), "manifest read errors must remain redacted");

    fs.readFileSync = (file, ...args) => {
      if (typeof file === "string" && file.endsWith("package.json")) {
        throw new Error("synthetic manifest read failure");
      }
      return originalReadFileSync(file, ...args);
    };
    let unreadableScan;
    try {
      unreadableScan = security.scanAll({}, { root: unreadableManifestRoot });
    } finally {
      fs.readFileSync = originalReadFileSync;
    }
    assert.equal(unreadableScan.ok, false, "unreadable manifest should make the scan incomplete");
    assert.ok(
      unreadableScan.errors.some(
        (error) => error.scanner === "dependencies" &&
          error.error.includes("Dependency manifest scan failed")
      ),
      "unreadable manifest should propagate a dependency error"
    );
    assert.equal(security.getDecision(unreadableScan), "ERROR", "unreadable manifest should return ERROR");
    assert.ok(!JSON.stringify(unreadableScan).includes("synthetic manifest read failure"), "unreadable manifest errors must remain redacted");

    // CLI must fail closed for an incomplete dependency scan.
    const securityCommand = require("../agent/cli/commands/security");
    const pipelineContext = require("../agent/pipeline/context");
    const securityModule = require("../agent/security/index");
    const originalBuild = pipelineContext.build;
    const originalSecurityScanAll = securityModule.scanAll;
    const originalExitCode = process.exitCode;
    pipelineContext.build = () => ({});
    securityModule.scanAll = () => ({
      ok: false,
      error: "Security scan could not complete: Dependency manifest scan failed",
      errors: [{ file: "package.json", scanner: "dependencies", error: "Dependency manifest scan failed" }],
      filesScanned: 0,
      filesSkipped: [],
      findings: [],
      criticalCount: 0,
      highCount: 0,
      totalFindings: 0,
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      byCategory: { secrets: 0, patterns: 0, vulnerabilities: 0, dependencies: 0, permissions: 0 },
    });
    try {
      securityCommand.handler();
      assert.equal(process.exitCode, 1, "the security CLI should exit 1 for incomplete scans");
    } finally {
      pipelineContext.build = originalBuild;
      securityModule.scanAll = originalSecurityScanAll;
      if (originalExitCode === undefined) delete process.exitCode;
      else process.exitCode = originalExitCode;
    }

    for (const file of ["src/repo/legit.js", "src/workspace/legit.js", "repo/legit.js", "workspace/legit.js"]) {
      assert.ok(
        result.findings.some((finding) => finding.file === file && finding.id === "patterns.eval"),
        `${file} should be scanned as a legitimate source directory`
      );
    }
    assert.ok(!result.findings.some((finding) => finding.file.startsWith("dist/")), "dist should remain excluded");

    // One scanner failure must not abort the scan, hide other findings, or leak
    // exception text/secrets into results or logs.
    const scannerSecret = "sk-" + "s".repeat(28);
    const secretsScanner = require("../agent/security/secrets");
    const originalSecretsScan = secretsScanner.scan;
    secretsScanner.scan = () => { throw new Error("simulated secrets scanner failure " + scannerSecret); };

    const originalLog = console.log;
    const capturedLogs = [];
    console.log = (...args) => { capturedLogs.push(args.join(" ")); };

    let scannerFailure;
    try {
      scannerFailure = security.scanAll({}, baseOptions);
    } finally {
      console.log = originalLog;
      secretsScanner.scan = originalSecretsScan;
    }

    assert.equal(scannerFailure.ok, false, "a scanner exception should make the scan incomplete");
    assert.ok(
      scannerFailure.errors.some(
        (error) => error.file === "src/secret.js" &&
          error.scanner === "secrets" &&
          error.error.includes("Scanner") &&
          !error.error.includes("simulated")
      ),
      "the scanner error should identify the file and category with a generic message"
    );
    assert.ok(
      scannerFailure.findings.some((finding) => finding.id === "patterns.eval"),
      "other scanners should still run after one scanner throws"
    );
    assert.equal(security.getDecision(scannerFailure), "ERROR", "scanner failures should produce ERROR");
    assert.ok(!JSON.stringify(scannerFailure).includes(scannerSecret), "scanner exception text must not leak into results");
    assert.ok(!JSON.stringify(scannerFailure.errors).includes(scannerSecret), "scanner exception text must not leak into errors");
    assert.ok(!capturedLogs.join("\n").includes(scannerSecret), "scanner exception text must not leak into logs");

    // Arbitrary scanner-provided labels/messages/remediation must be ignored in
    // favor of trusted static metadata.
    const patternsScanner = require("../agent/security/patterns");
    const originalPatternsScan = patternsScanner.scan;
    patternsScanner.scan = (file) => file === "src/unsafe.js" ? [{
      id: "patterns.eval",
      severity: "urgent",
      file,
      line: 1,
      label: "leaked label " + scannerSecret,
      message: "leaked message " + scannerSecret,
      remediation: "leaked remediation " + scannerSecret,
    }] : [];

    let metadataScan;
    try {
      metadataScan = security.scanAll({}, baseOptions);
    } finally {
      patternsScanner.scan = originalPatternsScan;
    }

    const metadataFinding = metadataScan.findings.find(
      (finding) => finding.file === "src/unsafe.js" && finding.id === "patterns.eval"
    );
    assert.ok(metadataFinding, "the static-id finding should survive metadata normalization");
    assert.equal(metadataFinding.severity, "info", "unsupported severities must fall back to info");
    assert.equal(metadataFinding.label, "Dynamic code execution (eval)", "labels must come from static metadata");
    assert.equal(metadataFinding.message, "Dynamic code execution (eval)", "messages must come from static metadata");
    assert.equal(
      metadataFinding.remediation,
      "Avoid eval; use a safe parser or an explicit command dispatcher.",
      "remediation must come from static metadata"
    );
    assert.ok(!JSON.stringify(metadataScan).includes(scannerSecret), "arbitrary scanner text must not leak into results");

    // Dependency project scanning failures must not suppress reference scanning.
    const dependencyScanner = require("../agent/security/dependencies");
    const originalScanProject = dependencyScanner.scanProject;
    const originalScanReferences = dependencyScanner.scanReferences;
    let referencesCalled = false;
    dependencyScanner.scanProject = () => { throw new Error("dependency failure " + scannerSecret); };
    dependencyScanner.scanReferences = () => {
      referencesCalled = true;
      return [{
        id: "dependencies.unsafe-reference",
        severity: "medium",
        file: "src/import.js",
        line: 0,
        label: "Unsafe reference: test",
        message: "Unsafe reference: test",
        remediation: "Review the dependency.",
      }];
    };

    let dependencyFailure;
    try {
      dependencyFailure = security.scanAll({}, baseOptions);
    } finally {
      dependencyScanner.scanProject = originalScanProject;
      dependencyScanner.scanReferences = originalScanReferences;
    }

    assert.equal(dependencyFailure.ok, false, "dependency failure should make the scan incomplete");
    assert.ok(referencesCalled, "reference scanning should still run");
    assert.ok(
      dependencyFailure.findings.some((finding) => finding.id === "dependencies.unsafe-reference"),
      "reference findings should survive a project scan failure"
    );
    assert.ok(
      dependencyFailure.errors.some(
        (error) => error.scanner === "dependencies" &&
          error.error.includes("Dependency manifest") &&
          !error.error.includes("dependency failure")
      ),
      "dependency failures should be generic and categorized"
    );
    assert.ok(!JSON.stringify(dependencyFailure).includes(scannerSecret), "dependency exception text must not leak");

    // Permission file scanning failures must not suppress gitignore scanning.
    const permissionScanner = require("../agent/security/permissions");
    const originalCheckFilePermissions = permissionScanner.checkFilePermissions;
    const originalCheckGitignore = permissionScanner.checkGitignore;
    let gitignoreCalled = false;
    permissionScanner.checkFilePermissions = () => { throw new Error("permission failure " + scannerSecret); };
    permissionScanner.checkGitignore = () => {
      gitignoreCalled = true;
      return [{
        id: "permissions.gitignore-missing-entry",
        severity: "low",
        file: ".gitignore",
        line: 0,
        label: "Consider adding a test entry",
        message: "Consider adding a test entry",
        remediation: "Add the entry to .gitignore.",
      }];
    };

    let permissionFailure;
    try {
      permissionFailure = security.scanAll({}, baseOptions);
    } finally {
      permissionScanner.checkFilePermissions = originalCheckFilePermissions;
      permissionScanner.checkGitignore = originalCheckGitignore;
    }

    assert.equal(permissionFailure.ok, false, "permission failure should make the scan incomplete");
    assert.ok(gitignoreCalled, "gitignore scanning should still run");
    assert.ok(
      permissionFailure.findings.some((finding) => finding.id === "permissions.gitignore-missing-entry"),
      "gitignore findings should survive a permission scan failure"
    );
    assert.ok(
      permissionFailure.errors.some(
        (error) => error.scanner === "permissions" &&
          error.error.includes("Permission file") &&
          !error.error.includes("permission failure")
      ),
      "permission failures should be generic and categorized"
    );
    assert.ok(!JSON.stringify(permissionFailure).includes(scannerSecret), "permission exception text must not leak");

    const nestedWorkspace = path.join(root, "src", "devos-workspace");
    const nested = security.scanAll({}, { ...baseOptions, workspace: nestedWorkspace });
    assert.equal(nested.ok, true, "nested workspace exclusion should complete");
    assert.ok(!nested.findings.some((finding) => finding.file.startsWith("src/devos-workspace/")), "configured nested workspace should be excluded");
    assert.ok(nested.findings.some((finding) => finding.file === "src/sibling.js"), "sibling source should be scanned");
    assert.ok(
      nested.findings.some((finding) => finding.file === "src/devos-workspace-other/secret.js"),
      "a sibling with the workspace prefix should not be excluded"
    );

    const nestedWithSlashes = security.scanAll({}, {
      ...baseOptions,
      workspace: nestedWorkspace.replace(/\\/g, "/"),
    });
    assert.equal(nestedWithSlashes.ok, true, "forward-slash workspace path should complete");
    assert.ok(
      !nestedWithSlashes.findings.some((finding) => finding.file.startsWith("src/devos-workspace/")),
      "forward-slash workspace path should still exclude the subtree"
    );
    assert.ok(nestedWithSlashes.findings.some((finding) => finding.file === "src/sibling.js"), "siblings should still be scanned");

    const deeperWorkspace = security.scanAll({}, {
      ...baseOptions,
      workspace: path.join(root, "src", "nested", "devos-workspace"),
    });
    assert.equal(deeperWorkspace.ok, true, "multi-level nested workspace exclusion should complete");
    assert.ok(
      !deeperWorkspace.findings.some((finding) => finding.file.startsWith("src/nested/devos-workspace/")),
      "multi-level nested workspace should be excluded"
    );
    assert.ok(
      deeperWorkspace.findings.some((finding) => finding.file === "src/devos-workspace-other/secret.js"),
      "siblings of a multi-level workspace should still be scanned"
    );

    const workspaceIsRoot = security.scanAll({}, { ...baseOptions, workspace: root });
    assert.equal(workspaceIsRoot.ok, true, "workspace equal to root should complete");
    assert.ok(
      workspaceIsRoot.findings.some((finding) => finding.file === "src/sibling.js"),
      "workspace equal to root must not exclude the whole project"
    );

    const workspaceOutside = security.scanAll({}, {
      ...baseOptions,
      workspace: path.join(temp, "outside-workspace"),
    });
    assert.equal(workspaceOutside.ok, true, "workspace outside root should complete");
    assert.ok(
      workspaceOutside.findings.some((finding) => finding.file === "src/sibling.js"),
      "workspace outside root should not exclude project files"
    );

    const workspaceIsParent = security.scanAll({}, { ...baseOptions, workspace: temp });
    assert.equal(workspaceIsParent.ok, true, "workspace parent should complete");
    assert.ok(
      workspaceIsParent.findings.some((finding) => finding.file === "src/sibling.js"),
      "workspace parent should not exclude project files"
    );

    // A deliberately small maxFiles value must fail closed.
    const limited = security.scanAll({}, { ...baseOptions, maxFiles: 2 });
    assert.equal(limited.ok, false, "exceeding maxFiles should fail the scan");
    assert.ok(limited.error.includes("File limit"), "the failure should identify the file limit");
    assert.equal(security.getDecision(limited), "ERROR", "incomplete scans should return ERROR");

    const limitedAnalysis = agent.analyze({}, "limit test", { ...baseOptions, maxFiles: 2 });
    const limitedReview = agent.review(agent.execute({}, limitedAnalysis, { ...baseOptions, maxFiles: 2 }));
    assert.equal(limitedReview.approved, false, "an incomplete scan must not be approved");
    assert.equal(limitedReview.decision, "ERROR", "an incomplete scan should return ERROR");

    const withinSmallLimit = security.scanAll({}, { ...baseOptions, maxFiles: 100 });
    assert.equal(withinSmallLimit.ok, true, "a project within maxFiles should complete");

    // A custom limit above the 2000 default must be honored by both the source
    // scanner and the permission scanner.
    const bigRoot = path.join(temp, "big-project");
    fs.mkdirSync(bigRoot, { recursive: true });
    fs.writeFileSync(path.join(bigRoot, ".gitignore"), ".env\n.env.local\nnode_modules/\ncredentials.json\n*.pem\n*.key\n*.log\n");
    for (let index = 0; index < 2001; index++) {
      fs.writeFileSync(path.join(bigRoot, `f${index}.js`), "");
    }

    const bigTooSmall = security.scanAll({}, { root: bigRoot, maxFiles: 2000 });
    assert.equal(bigTooSmall.ok, false, "2000 files should exceed maxFiles=2000");
    assert.ok(bigTooSmall.error.includes("File limit"), "big-project failure should identify the file limit");
    assert.equal(security.getDecision(bigTooSmall), "ERROR", "big-project incomplete scan should be ERROR");

    const bigReview = agent.review(agent.execute({}, null, { root: bigRoot, maxFiles: 2000 }));
    assert.equal(bigReview.approved, false, "big-project incomplete scan must not be approved");
    assert.equal(bigReview.decision, "ERROR", "big-project incomplete scan should be ERROR");

    const bigWithinLimit = security.scanAll({}, { root: bigRoot, maxFiles: 2100 });
    assert.equal(bigWithinLimit.ok, true, "permissions must use the same custom maxFiles as the source scanner");

    const secretFinding = result.findings.find((finding) => finding.file === "src/secret.js" && finding.id === "secrets.api-key");
    assert.ok(secretFinding, "the secret finding should include the rule id");
    assert.equal(secretFinding.severity, "critical", "hardcoded secret should be critical");
    assert.equal(secretFinding.line, 1, "the finding should report the correct line");
    assert.ok(secretFinding.remediation, "findings should include remediation");
    assert.ok(result.findings.every((finding) => finding.message && finding.id && finding.remediation), "findings should be structured");
    assert.ok(result.findings.every((finding) => !Object.prototype.hasOwnProperty.call(finding, "snippet")), "findings must not include raw source snippets");
    assert.equal(result.criticalCount, result.summary.critical, "criticalCount should mirror the summary");
    assert.equal(result.totalFindings, result.summary.total, "totalFindings should mirror the summary");

    const emptyFile = files.readSourceFile(path.join(root, "src", "empty.js"), { maxFileSizeBytes: 120 });
    assert.equal(emptyFile.content, "", "empty files should be read as empty content");
    assert.equal(emptyFile.skipped, false, "empty files should not be skipped");

    const binaryFile = files.readSourceFile(path.join(root, "src", "binary.bin"), { maxFileSizeBytes: 120 });
    assert.equal(binaryFile.skipped, true, "binary files should be skipped");
    assert.ok(binaryFile.reason.includes("binary"), "binary skip reason should be explicit");

    const largeFile = files.readSourceFile(path.join(root, "src", "large.js"), { maxFileSizeBytes: 120 });
    assert.equal(largeFile.skipped, true, "oversized files should be skipped");
    assert.ok(largeFile.reason.includes("too-large"), "oversized skip reason should be explicit");

    if (directorySymlinkCreated) {
      assert.ok(
        result.filesSkipped.some((entry) => entry.file === "src/linked-directory" && entry.reason === "symlink"),
        "directory symlinks should remain skipped in a complete scan"
      );
      assert.ok(
        !result.findings.some((finding) => finding.file.startsWith("src/linked-directory/")),
        "files behind a directory symlink must not be scanned"
      );
    }

    if (rootSymlinkCreated) {
      const rootLinkResult = security.scanAll({}, { root: path.join(temp, "linked-root") });
      assert.equal(rootLinkResult.ok, false, "a symlink root should fail explicitly");
      assert.ok(rootLinkResult.error.includes("symlink"), "the root symlink policy should be explicit");
      assert.equal(security.getDecision(rootLinkResult), "ERROR", "a symlink root should be ERROR");
    }

    // Bounded reading: never read more than maxFileSizeBytes + 1.
    const boundedPath = write("src/bounded.js", "x".repeat(300));
    const boundedFd = fs.openSync(boundedPath, "r");
    try {
      const bounded = files.readBounded(boundedFd, 100);
      assert.equal(bounded.overflow, true, "bounded reads should detect overflow");
      assert.equal(bounded.bytesRead, 101, "bounded reads should stop at limit + 1");
      assert.equal(bounded.buffer.length, 101, "bounded reads should not allocate unbounded content");
    } finally {
      fs.closeSync(boundedFd);
    }

    const emptyFd = fs.openSync(path.join(root, "src", "empty.js"), "r");
    try {
      const emptyBounded = files.readBounded(emptyFd, 100);
      assert.equal(emptyBounded.overflow, false, "empty files should not overflow");
      assert.equal(emptyBounded.bytesRead, 0, "empty files should read zero bytes");
    } finally {
      fs.closeSync(emptyFd);
    }

    const injectedOversize = files.readSourceFile(path.join(root, "src", "empty.js"), {
      readFile: () => Buffer.alloc(300),
      maxFileSizeBytes: 100,
    });
    assert.equal(injectedOversize.skipped, true, "injected oversized readers should be bounded");
    assert.ok(injectedOversize.reason.includes("too-large"), "injected oversized readers should report too-large");

    // Production safe-open integration: grow the file after the descriptor has
    // been opened and validated, but before the bounded read.
    const growingPath = write("src/growing.js", "x".repeat(20));
    let growingDescriptor;
    const growing = files.readSourceFile(growingPath, {
      maxFileSizeBytes: 100,
      onDescriptorOpened: (descriptor) => { growingDescriptor = descriptor; },
      beforeRead: () => { fs.appendFileSync(growingPath, "y".repeat(300)); },
    });
    assert.equal(growing.skipped, true, "a growing file should be skipped");
    assert.ok(growing.reason.includes("too-large"), "a growing file should be classified as too-large");
    assert.equal(growing.bytesRead, 101, "the production reader must stop at maxFileSizeBytes + 1");
    assert.throws(() => fs.fstatSync(growingDescriptor), "descriptor should be closed after bounded overflow");

    // Successful production read closes its descriptor.
    let successDescriptor;
    const successRead = files.readSourceFile(path.join(src, "empty.js"), {
      onDescriptorOpened: (descriptor) => { successDescriptor = descriptor; },
    });
    assert.equal(successRead.content, "", "empty file should retain empty content");
    assert.throws(() => fs.fstatSync(successDescriptor), "descriptor should be closed after a successful read");

    // Binary content is detected after opening and still closes the descriptor.
    const binaryContentPath = write("src/binary-content.js", Buffer.from([0, 1, 2, 3]));
    let binaryDescriptor;
    const binaryContent = files.readSourceFile(binaryContentPath, {
      onDescriptorOpened: (descriptor) => { binaryDescriptor = descriptor; },
    });
    assert.equal(binaryContent.skipped, true, "binary content should be skipped");
    assert.equal(binaryContent.reason, "binary-content", "binary content should use the expected skip reason");
    assert.throws(() => fs.fstatSync(binaryDescriptor), "descriptor should be closed after binary detection");

    // File growth before the fstat check is classified as too-large and closed.
    const afterOpenPath = write("src/after-open-large.js", "x".repeat(20));
    let afterOpenDescriptor;
    const afterOpenLarge = files.readSourceFile(afterOpenPath, {
      maxFileSizeBytes: 100,
      onDescriptorOpened: (descriptor) => {
        afterOpenDescriptor = descriptor;
        fs.appendFileSync(afterOpenPath, "y".repeat(300));
      },
    });
    assert.equal(afterOpenLarge.skipped, true, "a file that grows before fstat should be skipped");
    assert.ok(afterOpenLarge.reason.includes("too-large"), "a file that grows before fstat should be too-large");
    assert.throws(() => fs.fstatSync(afterOpenDescriptor), "descriptor should be closed after post-open size check");

    // Identity changes after opening are reported and the descriptor is closed.
    const mismatchPath = write("src/mismatch.js", "x".repeat(20));
    let mismatchDescriptor;
    const mismatch = files.readSourceFile(mismatchPath, {
      maxFileSizeBytes: 100,
      onDescriptorOpened: (descriptor) => {
        mismatchDescriptor = descriptor;
        fs.appendFileSync(mismatchPath, "y");
      },
    });
    assert.ok(mismatch.error.includes("changed"), "identity mismatch should be explicit");
    assert.throws(() => fs.fstatSync(mismatchDescriptor), "descriptor should be closed after identity mismatch");

    // A file that changes after the pre-read identity check is detected after
    // the bounded read and still closes the descriptor.
    const changedDuringReadPath = write("src/changed-during-read.js", "x".repeat(20));
    let changedDuringReadDescriptor;
    const changedDuringRead = files.readSourceFile(changedDuringReadPath, {
      maxFileSizeBytes: 100,
      onDescriptorOpened: (descriptor) => { changedDuringReadDescriptor = descriptor; },
      beforeRead: () => { fs.appendFileSync(changedDuringReadPath, "y"); },
    });
    assert.ok(changedDuringRead.error.includes("changed"), "a file changing during read should be explicit");
    assert.throws(
      () => fs.fstatSync(changedDuringReadDescriptor),
      "descriptor should be closed after a change detected after read"
    );

    // A read failure after opening is reported and the descriptor is closed.
    const readErrorPath = write("src/read-error.js", "x");
    let readErrorDescriptor;
    const originalReadSync = fs.readSync;
    fs.readSync = () => { throw new Error("simulated read failure"); };
    try {
      const readError = files.readSourceFile(readErrorPath, {
        maxFileSizeBytes: 100,
        onDescriptorOpened: (descriptor) => { readErrorDescriptor = descriptor; },
      });
      assert.ok(readError.error.includes("file could not be read"), "read errors should be generic and explicit");
      assert.ok(!readError.error.includes("simulated read failure"), "raw reader errors must not leak");
    } finally {
      fs.readSync = originalReadSync;
    }
    assert.throws(() => fs.fstatSync(readErrorDescriptor), "descriptor should be closed after a read error");

    const missing = security.scanAll({}, { root: path.join(temp, "missing") });
    assert.equal(missing.ok, false, "missing workspace should fail explicitly");
    assert.ok(missing.error.includes("not accessible"), "missing workspace should produce an actionable error");

    const notDirectory = path.join(temp, "not-a-directory");
    fs.writeFileSync(notDirectory, "x");
    const invalid = security.scanAll({}, { root: notDirectory });
    assert.equal(invalid.ok, false, "file path used as workspace should fail explicitly");
    assert.ok(invalid.error.includes("not a directory"), "invalid workspace should explain the problem");

    const analysis = agent.analyze({}, "security test", baseOptions);
    assert.equal(analysis.ok, true, "security agent analysis should complete");
    assert.ok(analysis.filesScanned >= 4, "security agent should report scanned files");
    assert.ok(analysis.findings.some((finding) => finding.file === "src/secret.js"), "security agent should see source findings");
    assert.equal(analysis.risk, "high", "critical findings should raise the risk");

    const review = agent.review(agent.execute({}, analysis, baseOptions));
    assert.equal(review.approved, false, "critical findings should not be approved");
    assert.equal(review.decision, "ROLLBACK", "critical findings should trigger ROLLBACK");
    assert.ok(review.issues.some((issue) => issue.includes("critical")), "review should explain the critical issue");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
};
