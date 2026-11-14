const { execSync } = require("child_process");
const DEVOS = require("../config");

function git(cmd, cwd = DEVOS.workspace) {
  return execSync(`git ${cmd}`, {
    encoding: "utf-8",
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitSafe(cmd, cwd = DEVOS.workspace) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8", cwd, stdio: "pipe" });
  } catch {
    return "";
  }
}

function getStatus(cwd = DEVOS.workspace) {
  return gitSafe("status --porcelain", cwd).trim();
}

function getBranch(cwd = DEVOS.workspace) {
  return gitSafe("rev-parse --abbrev-ref HEAD", cwd).trim();
}

module.exports = { git, gitSafe, getStatus, getBranch };
