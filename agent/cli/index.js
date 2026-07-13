const path = require("path");
const out = require("./output");

const COMMANDS_DIR = path.join(__dirname, "commands");

const builtins = {
  help: {
    description: "Show this help message",
    handler: () => {
      out.banner("DevOS CLI Commands");
      const rows = [["COMMAND", "DESCRIPTION"]];
      for (const [name, cmd] of Object.entries(registry)) {
        rows.push([name, cmd.description || ""]);
      }
      out.table(rows);
      console.log("");
      out.info(`Usage: ${out.colorize("node cli.js <command> [args]", "cyan")}`);
      console.log("");
    },
  },
};

const registry = { ...builtins };

function loadCommands() {
  const fs = require("fs");
  const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".js"));
  for (const file of files) {
    const name = file.replace(".js", "");
    try {
      const mod = require(path.join(COMMANDS_DIR, file));
      registry[name] = { handler: mod.handler, description: mod.description || name };
    } catch (e) {
      console.error(`Failed to load command '${name}': ${e.message}`);
    }
  }
}

function run(argv) {
  loadCommands();
  const [command, ...args] = argv;

  if (!command || command === "help" || !registry[command]) {
    registry.help.handler();
    return;
  }

  try {
    registry[command].handler(args);
  } catch (e) {
    out.error(`Command failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { run, registry };
