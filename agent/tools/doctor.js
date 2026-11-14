const { execFile } = require("child_process");
const { promisify } = require("util");
const DEVOS = require("../config");

const execFileAsync = promisify(execFile);

function npmCheck() {
  if (process.platform === "win32") {
    // Node cannot spawn .cmd files directly without a shell. cmd.exe avoids the
    // deprecated shell + args combination while still resolving npm.cmd.
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", "npm --version"],
    };
  }
  return { command: "npm", args: ["--version"] };
}

async function checkOne(check) {
  try {
    const { stdout } = await execFileAsync(check.command, check.args, {
      cwd: check.cwd || DEVOS.root,
      encoding: "utf-8",
      timeout: 15000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { name: check.name, status: "ok", version: stdout.trim() };
  } catch {
    // A missing workspace is expected on a fresh clone: it is created by the
    // first pipeline run. Do not fail the health check for it.
    if (check.optional) {
      return { name: check.name, status: "ok", version: "not initialized (created on first run)" };
    }
    return { name: check.name, status: "missing" };
  }
}

async function run() {
  const checks = [
    { name: "git", command: "git", args: ["--version"] },
    { name: "node", command: process.execPath, args: ["--version"] },
    { name: "npm", ...npmCheck() },
    { name: "workspace", command: "git", args: ["rev-parse", "--abbrev-ref", "HEAD"], cwd: DEVOS.workspace, optional: true },
  ];

  const results = await Promise.all(checks.map(checkOne));
  return { ok: results.every((result) => result.status === "ok"), checks: results };
}

module.exports = { run };
