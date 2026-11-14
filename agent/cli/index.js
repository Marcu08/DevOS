const path = require("path");
const out = require("./output");
const manifest = require("./command-manifest");

const COMMANDS_DIR = path.join(__dirname, "commands");
const pluginCommands = {};
let pluginCommandsLoaded = false;

const registry = {
  help: {
    description: "Show this help message",
    handler: () => help(),
  },
};

// Register built-in commands lazily. The module is required only when the
// command is actually invoked, so `help`, `config`, or `mode` do not load the
// pipeline, GitHub, security, or explain engines.
for (const entry of manifest) {
  Object.defineProperty(registry, entry.name, {
    enumerable: true,
    configurable: true,
    get() {
      const mod = require(path.join(COMMANDS_DIR, entry.file));
      return { handler: mod.handler, description: entry.description };
    },
  });
}

function loadPluginCommands() {
  if (pluginCommandsLoaded) return pluginCommands;
  pluginCommandsLoaded = true;

  try {
    const pm = require("../../plugins/manager");
    const cmdReg = pm.getInstance().getCommandsRegistry();
    const allCmds = cmdReg.loadAll();

    for (const [cmdName, cmdDef] of Object.entries(allCmds)) {
      const shadowsBuiltin = Object.prototype.hasOwnProperty.call(registry, cmdName);
      if (!cmdName.includes(":") && shadowsBuiltin) continue;

      pluginCommands[cmdName] = cmdDef;
      Object.defineProperty(registry, cmdName, {
        enumerable: true,
        configurable: true,
        get() {
          return cmdDef;
        },
      });
    }
  } catch (e) {
    console.error(`Failed to load plugin commands: ${e.message}`);
  }

  return pluginCommands;
}

function help() {
  out.banner("DevOS CLI Commands");
  const rows = [["COMMAND", "DESCRIPTION"], ["help", registry.help.description]];

  for (const entry of manifest) {
    rows.push([entry.name, entry.description]);
  }

  const plugins = loadPluginCommands();
  for (const [name, cmd] of Object.entries(plugins)) {
    rows.push([name, cmd.description || ""]);
  }

  out.table(rows);
  console.log("");
  out.info(`Usage: ${out.colorize("node cli.js <command> [args]", "cyan")}`);
  console.log("");
}

async function run(argv) {
  const [command, ...args] = argv;

  if (!command || command === "help") {
    help();
    return;
  }

  let cmd;
  try {
    cmd = registry[command];
  } catch (e) {
    out.error(`Failed to load command '${command}': ${e.message}`);
    process.exit(1);
  }

  // Commands contributed by plugins are discovered only when a built-in
  // command does not match.
  if (!cmd) {
    loadPluginCommands();
    cmd = registry[command];
  }

  if (!cmd) {
    help();
    return;
  }

  try {
    await cmd.handler(args);
  } catch (e) {
    out.error(`Command failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { run, registry };
