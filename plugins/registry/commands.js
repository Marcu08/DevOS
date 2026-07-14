const path = require("path");
const COMMANDS_DIR = path.resolve(__dirname, "../../agent/cli/commands");

class CommandsRegistry {
  constructor() {
    this._plugins = {};
  }

  register(name, commandDef, pluginName) {
    this._plugins[name] = { ...commandDef, plugin: pluginName };
  }

  unregister(name) {
    delete this._plugins[name];
  }

  get(name) {
    return this._plugins[name] || null;
  }

  has(name) {
    return name in this._plugins;
  }

  _loadBuiltins() {
    const fs = require("fs");
    const builtins = {};
    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith(".js"));
    for (const file of files) {
      const name = file.replace(".js", "");
      try {
        const mod = require(path.join(COMMANDS_DIR, file));
        builtins[name] = { handler: mod.handler, description: mod.description || name };
      } catch (e) {
        console.error(`Failed to load command '${name}': ${e.message}`);
      }
    }
    return builtins;
  }

  loadAll() {
    const builtins = this._loadBuiltins();
    const all = {};

    for (const [name, cmd] of Object.entries(builtins)) {
      all[name] = cmd;
    }

    for (const [name, cmd] of Object.entries(this._plugins)) {
      const qualified = cmd.plugin ? `${cmd.plugin}:${name}` : name;
      all[qualified] = { handler: cmd.handler, description: cmd.description || name };
    }

    return all;
  }

  available() {
    return {
      builtins: Object.keys(this._loadBuiltins()),
      plugins: Object.keys(this._plugins),
    };
  }
}

module.exports = CommandsRegistry;