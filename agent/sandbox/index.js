const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const DEVOS = require("../config");
const log = require("../logger").get();

const SANDBOX_DIR = path.join(DEVOS.root, "sandbox");
const ORIGINAL_DIR = path.join(SANDBOX_DIR, "original");
const SANDBOX_WORK_DIR = path.join(SANDBOX_DIR, "sandbox");
const RESULTS_DIR = path.join(SANDBOX_DIR, "results");
const STATUS_FILE = path.join(SANDBOX_DIR, "status.json");

const EXCLUDES = ["node_modules", ".git", "logs", "backup", "workspace", "sandbox", ".gitignore"];

function ensureDirs() {
  for (const d of [SANDBOX_DIR, ORIGINAL_DIR, SANDBOX_WORK_DIR, RESULTS_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function copyRecursive(src, dest, exclude) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyRecursive(s, d, exclude);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function safeRm(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    if (e.code === "EPERM") {
      try { setTimeout(() => fs.rmSync(dir, { recursive: true, force: true }), 100); } catch {}
    }
  }
}

function create() {
  log.info("Creating sandbox environment...", "SANDBOX");
  ensureDirs();
  safeRm(ORIGINAL_DIR);
  safeRm(SANDBOX_WORK_DIR);
  fs.mkdirSync(ORIGINAL_DIR, { recursive: true });
  fs.mkdirSync(SANDBOX_WORK_DIR, { recursive: true });

  copyRecursive(DEVOS.root, ORIGINAL_DIR, EXCLUDES);
  copyRecursive(DEVOS.root, SANDBOX_WORK_DIR, EXCLUDES);

  const status = {
    created: new Date().toISOString(),
    state: "ready",
    originalFiles: countFiles(ORIGINAL_DIR),
    sandboxFiles: countFiles(SANDBOX_WORK_DIR),
    changes: [],
    validation: null,
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  log.info(`Sandbox created: ${status.sandboxFiles} files`, "SANDBOX");
  return status;
}

function status() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")); }
  catch { return { state: "not_created" }; }
}

function clean() {
  log.info("Cleaning sandbox...", "SANDBOX");
  fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
  log.info("Sandbox cleaned", "SANDBOX");
  return { state: "cleaned" };
}

function applyChanges(changes) {
  const sandboxStatus = status();
  if (sandboxStatus.state === "not_created") return { error: "Sandbox not created. Run 'sandbox create' first." };

  for (const change of (changes || [])) {
    const srcPath = path.join(DEVOS.root, change.file);
    const dstPath = path.join(SANDBOX_WORK_DIR, change.file);
    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
    }
    sandboxStatus.changes.push({ file: change.file, type: change.type || "modified", timestamp: new Date().toISOString() });
  }

  sandboxStatus.state = "modified";
  sandboxStatus.updated = new Date().toISOString();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(sandboxStatus, null, 2));
  return sandboxStatus;
}

function runTests() {
  const sandboxStatus = status();
  if (sandboxStatus.state === "not_created") return { error: "Sandbox not created" };

  try {
    const result = execSync("node tests/runner.js", { cwd: SANDBOX_WORK_DIR, encoding: "utf-8", timeout: 60000 });
    sandboxStatus.validation = { passed: true, output: result.slice(0, 500) };
  } catch (e) {
    sandboxStatus.validation = { passed: false, output: (e.stdout || e.message || "").slice(0, 500) };
  }

  sandboxStatus.state = "validated";
  fs.writeFileSync(STATUS_FILE, JSON.stringify(sandboxStatus, null, 2));
  return sandboxStatus;
}

function compare() {
  const sandboxStatus = status();
  if (sandboxStatus.state === "not_created") return { error: "Sandbox not created" };

  const diffs = [];
  for (const change of sandboxStatus.changes) {
    const originalPath = path.join(ORIGINAL_DIR, change.file);
    const sandboxPath = path.join(SANDBOX_WORK_DIR, change.file);
    const originalExists = fs.existsSync(originalPath);
    const sandboxExists = fs.existsSync(sandboxPath);

    if (!originalExists && sandboxExists) diffs.push({ file: change.file, type: "added" });
    else if (originalExists && !sandboxExists) diffs.push({ file: change.file, type: "deleted" });
    else if (originalExists && sandboxExists) {
      const orig = fs.readFileSync(originalPath, "utf-8");
      const sb = fs.readFileSync(sandboxPath, "utf-8");
      if (orig !== sb) diffs.push({ file: change.file, type: "modified", originalSize: orig.length, sandboxSize: sb.length });
    }
  }

  return {
    totalChanges: sandboxStatus.changes.length,
    diffs,
    validation: sandboxStatus.validation,
    state: sandboxStatus.state,
  };
}

function merge() {
  const comparison = compare();
  if (comparison.error) return comparison;

  for (const diff of comparison.diffs) {
    const src = path.join(SANDBOX_WORK_DIR, diff.file);
    const dst = path.join(DEVOS.root, diff.file);
    if (diff.type === "added" || diff.type === "modified") {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
    } else if (diff.type === "deleted") {
      try { fs.unlinkSync(dst); } catch {}
    }
  }

  const sandboxStatus = status();
  sandboxStatus.state = "merged";
  sandboxStatus.merged = new Date().toISOString();
  fs.writeFileSync(STATUS_FILE, JSON.stringify(sandboxStatus, null, 2));

  return { merged: comparison.diffs.length, state: "merged" };
}

function countFiles(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
      else count++;
    }
  } catch {}
  return count;
}

module.exports = { create, status, clean, applyChanges, runTests, compare, merge, SANDBOX_DIR };
