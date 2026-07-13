const out = require("../output");
const { spawn } = require("child_process");
const path = require("path");

function handler() {
  out.banner("DevOS Dashboard");

  const serverPath = path.join(__dirname, "..", "..", "..", "dashboard", "server.js");
  const child = spawn("node", [serverPath], {
    stdio: "inherit",
    cwd: path.join(__dirname, "..", "..", ".."),
  });

  process.on("SIGINT", () => {
    child.kill();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    child.kill();
    process.exit(0);
  });
}

module.exports = { handler, description: "Start local web dashboard (localhost:3000)" };
