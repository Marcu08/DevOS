const path = require("path");
const { spawnSync } = require("child_process");

function handler(args) {
  const setupScript = path.join(__dirname, "..", "..", "..", "scripts", "setup.js");
  const result = spawnSync(process.execPath, [setupScript, ...args], { stdio: "inherit" });

  if (result.error) {
    console.error(`Setup failed: ${result.error.message}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = result.status || 0;
}

module.exports = { handler, description: "Configure AI, GitHub, and Supabase credentials" };
