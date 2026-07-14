# DevOS Plugin Framework v2 — Design Specification

## Core Philosophy

An AI engineering plugin framework is not a traditional plugin system.
Traditional plugins extend a fixed set of points (CLI, UI, database).
AI plugins must extend the *agent's mind* — what it knows, how it
thinks, what tools it can use, and how it validates results.

The framework has one job: **make every plugin feel like a native
capability of the AI agent.**

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Registry                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Plugin A │  │ Plugin B │  │ Plugin C │  │ Plugin D │    │
│  │ (npm pkg)│  │ (dir)    │  │ (built-in)│  │ (npm pkg)│    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘         │
│                              │                                │
│                     Plugin Manager                            │
│    (load, resolve deps, cache, sandbox, lifecycle)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Extension Bus                               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Tools   │  │Validators│  │  Hooks   │  │ Commands │    │
│  │  Registry│  │ Registry │  │  Registry│  │ Registry │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Providers│  │  Agents  │  │  Memory  │  │ Security │    │
│  │  Registry│  │ Registry │  │  Hooks   │  │  Hooks   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Context │  │  Prompt  │  │  Config  │                   │
│  │ Augment  │  │  Inject  │  │  Schema  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**Key idea:** There is no single plugin interface. Instead, a plugin
is a *module* that exports capabilities into one or more registries.
The Plugin Manager loads plugins, resolves dependencies, and
orchestrates lifecycle events. The Extension Bus is the runtime
connection between plugin capabilities and the DevOS pipeline.

---

## 2. Plugin Package Format

A plugin is a Node.js module (a directory with `index.js` or an npm
package) that exports a descriptor object.

### Minimal Plugin

```js
// plugins/my-plugin/index.js
module.exports = {
  name: "my-plugin",
  version: "2.1.0",
  description: "Does something useful",
};
```

### Full Plugin with All Extension Points

```js
module.exports = {
  // ── Identity ───────────────────────────────────────────────
  name: "graphql",
  version: "2.0.0",
  description: "GraphQL tooling for DevOS",
  author: "Your Name",
  license: "MIT",

  // ── Dependencies ───────────────────────────────────────────
  // Other plugins this one depends on. Resolved by the Plugin
  // Manager before this plugin's lifecycle methods are called.
  dependsOn: ["javascript", "npm"],

  // ── Configuration Schema ───────────────────────────────────
  // JSON Schema for the plugin's config section in devos.json.
  // The Plugin Manager validates user config against this schema
  // and passes the merged result to init().
  configSchema: {
    type: "object",
    properties: {
      strictMode: { type: "boolean", default: true },
      schemaDir: { type: "string", default: "schema/" },
    },
  },

  // ── Detection ──────────────────────────────────────────────
  // When should this plugin activate? Can be a static array,
  // a function, or an object with a match() method.
  detect: [
    ".graphql",
    ".gql",
    "graphql.config.js",
    /^@graphql-/,
    { pattern: "apollo-server", weight: 2 },
  ],

  // ── Tools ──────────────────────────────────────────────────
  // Each tool is a function that receives args and context,
  // and returns { ok, data?, error? }.
  tools: {
    "graphql-inspector": {
      description: "Validate GraphQL schema changes",
      run: async (args, ctx) => {
        const { execSync } = require("child_process");
        try {
          const output = execSync(
            `npx graphql-inspector validate ${args.join(" ")}`,
            { encoding: "utf-8", cwd: ctx.workspace }
          );
          return { ok: true, data: output };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },
    },
  },

  // ── Validators ─────────────────────────────────────────────
  // Each validator runs during the validation phase. Returns a
  // result matching the existing DevOS validator format.
  validators: {
    "graphql-schema": {
      description: "Validate GraphQL schema syntax",
      run: async (context) => {
        const start = Date.now();
        const files = (context.modifiedFiles || [])
          .filter(f => f.endsWith(".graphql") || f.endsWith(".gql"));
        if (files.length === 0) {
          return { name: "graphql-schema", status: "skipped",
                   time: Date.now() - start, error: null };
        }
        // ... validation logic ...
        return { name: "graphql-schema", status: "passed",
                 time: Date.now() - start, error: null };
      },
    },
  },

  // ── CLI Commands ───────────────────────────────────────────
  // Each command is a subcommand under `node cli.js plugins run <name>`.
  // Or, if the plugin is active, the commands merge into the top-level
  // CLI namespace.
  commands: {
    "schema:check": {
      description: "Validate GraphQL schema against operations",
      handler: async (args, ctx) => {
        // args is the remaining CLI arguments
        // ctx provides access to workspace, config, logger, etc.
      },
    },
  },

  // ── Context Augmenters ─────────────────────────────────────
  // Functions that add data to the context object before the AI
  // reasons about the task. Called in order, each receives the
  // context and can mutate it.
  contextAugmenters: [
    {
      name: "inject-graphql-schema-summary",
      description: "Adds a summary of schema types to context",
      run: async (ctx) => {
        const schemaFiles = ctx.topFiles
          .filter(f => f.file.endsWith(".graphql"))
          .map(f => ({ file: f.file, path: f.file }));
        ctx.graphql = { schemaFiles };
        return ctx;
      },
    },
  ],

  // ── Prompt Injectors ───────────────────────────────────────
  // Each injector returns a string that gets appended to the
  // system prompt when the AI agent processes a task. This lets
  // plugins teach the AI about conventions, patterns, and rules.
  promptInjectors: [
    {
      name: "graphql-rules",
      description: "GraphQL best practices for the AI agent",
      run: async (ctx) => {
        return [
          "When modifying GraphQL schemas:",
          "  - Never remove a field without adding @deprecated first",
          "  - Pagination must follow the Relay Connection spec",
          "  - Resolver return types must match the schema type",
          "  - Use `graphql-inspector` to validate changes",
        ].join("\n");
      },
    },
  ],

  // ── Pipeline Hooks ─────────────────────────────────────────
  // Lifecycle hooks that fire at specific points in the pipeline.
  hooks: {
    // Called after the plugin is loaded and dependencies resolved
    async onInit(config) {
      // config = merged user config + defaults from configSchema
      this.schemaDir = config.schemaDir;
    },

    // Called after detection determines this plugin is active
    async onActivate(ctx) {
      console.log(`[graphql] Plugin activated for ${ctx.totalFiles} files`);
    },

    // Called before the AI reasons about the task
    async onBeforeReason(ctx, task) {
      // Can modify ctx or task
    },

    // Called after the AI produces a plan
    async onAfterPlan(plan) {
      // Can modify the plan or reject it
    },

    // Called before the executor runs
    async onBeforeExecute(plan) {
      // Can modify execution steps
    },

    // Called after execution completes
    async onAfterExecute(result) {
      // Can inspect/modify result
    },

    // Called during healing on failure
    async onHeal(error, attempt) {
      // Can provide recovery logic
    },

    // Called when the pipeline completes
    async onComplete(report) {
      // Cleanup, logging, etc.
    },

    // Called when the plugin is deactivated or DevOS shuts down
    async onDeactivate() {
      // Cleanup resources
    },
  },
};
```

---

## 3. Extension Bus — The Core Integration Points

The Extension Bus is the runtime layer that connects plugin capabilities
to DevOS internals. Each registry is a distinct collection that the
DevOS pipeline queries at the appropriate time.

### 3.1 Tools Registry

**Current:** Hardcoded `REGISTRY` map in `agent/tools/index.js`.

**New:** Dynamic registry populated by plugins. The `run()` function
checks both built-in tools and plugin-contributed tools.

```js
// agent/tools/index.js — redesigned
class ToolsRegistry {
  constructor() {
    this._builtins = { /* existing hardcoded tools */ };
    this._plugins = {};
  }

  register(name, toolDef, pluginName) {
    this._plugins[name] = { ...toolDef, plugin: pluginName };
  }

  unregister(name) {
    delete this._plugins[name];
  }

  run(name, args, ctx) {
    const tool = this._builtins[name] || this._plugins[name];
    if (!tool) return { ok: false, error: `Unknown tool: ${name}` };
    return tool.run(args, ctx);
  }

  available() {
    return [
      ...Object.keys(this._builtins),
      ...Object.keys(this._plugins),
    ];
  }
}
```

### 3.2 Validators Registry

**Current:** Hardcoded 4 validators in `agent/validator/index.js`.

**New:** Plugin validators are merged into the validation pipeline.
They run after built-in validators, in registration order.

```js
// agent/validator/index.js — redesigned
function validate(context) {
  const results = [];
  // 1. Built-in validators
  for (const name of ["syntax", "git", "node", "lint"]) {
    results.push(runValidator(name, context));
  }
  // 2. Plugin validators
  const pluginValidators = pluginManager.getActiveValidators(context);
  for (const { name, run } of pluginValidators) {
    results.push(run(context));
  }
  return reportBuilder.build(results);
}
```

### 3.3 CLI Commands Registry

**Current:** Auto-discovers `.js` files from `agent/cli/commands/`.

**New:** Plugin commands are merged into the CLI registry. Namespace
collisions are resolved by prefixing with the plugin name.

```js
// agent/cli/index.js — redesigned
function loadCommands() {
  // 1. Built-in commands from agent/cli/commands/
  for (const file of fs.readdirSync(COMMANDS_DIR)) { /* ... */ }
  // 2. Plugin commands
  for (const plugin of pluginManager.getAll()) {
    if (plugin.commands) {
      for (const [name, def] of Object.entries(plugin.commands)) {
        const qualified = `${plugin.name}:${name}`;
        registry[qualified] = {
          handler: (args) => def.handler(args, { workspace, config, logger }),
          description: def.description,
        };
      }
    }
  }
}
```

### 3.4 Context Augmenters

**New concept.** Before the AI reasons about a task, the context
object is built. Plugin context augmenters add domain-specific data.

```js
// agent/pipeline/context.js — redesigned
async function build() {
  let ctx = buildBaseContext();

  // Run plugin context augmenters
  const activePlugins = pluginManager.detect(ctx);
  for (const plugin of activePlugins) {
    if (plugin.contextAugmenters) {
      for (const augmenter of plugin.contextAugmenters) {
        ctx = await augmenter.run(ctx) || ctx;
      }
    }
  }

  return ctx;
}
```

### 3.5 Prompt Injectors

**New concept.** Each plugin can inject text into the AI system prompt.
This is how a plugin teaches the AI about project-specific conventions.

```js
// agent/pipeline/reasoning.js — redesigned
async function buildSystemPrompt(ctx) {
  const parts = [basePrompt];

  const activePlugins = pluginManager.detect(ctx);
  for (const plugin of activePlugins) {
    if (plugin.promptInjectors) {
      for (const injector of plugin.promptInjectors) {
        const text = await injector.run(ctx);
        if (text) parts.push(text);
      }
    }
  }

  return parts.join("\n\n---\n\n");
}
```

### 3.6 Pipeline Hooks

**New concept.** Each lifecycle stage in the pipeline fires a hook
that active plugins can intercept.

```js
// agent/pipeline/index.js — redesigned
async function run(task) {
  state.init(task);
  const ctx = await context.build();

  await pluginManager.fireHook("onBeforeReason", ctx, task);
  const reasoned = await reasoning.reason(ctx);
  await pluginManager.fireHook("onAfterPlan", reasoned);

  // ... etc
}
```

The `pluginManager.fireHook()` method calls the hook on every active
plugin in parallel:

```js
async fireHook(hookName, ...args) {
  const promises = [];
  for (const plugin of this._active) {
    if (plugin.hooks && plugin.hooks[hookName]) {
      promises.push(plugin.hooks[hookName](...args));
    }
  }
  await Promise.all(promises);
}
```

### 3.7 Provider Registration

**Currently:** Auto-discovers `.js` files from `providers/` dir.

**New:** Plugins can register AI providers. This enables
plugin-specific AI models (e.g., a "code-review" plugin that registers
a specialized review model).

```js
// Plugin can register a provider
module.exports = {
  name: "my-custom-llm",
  providers: {
    "my-model": {
      isAvailable: () => !!process.env.MY_MODEL_KEY,
      generate: async (prompt) => { /* ... */ },
      analyze: async (context, task) => { /* ... */ },
      review: async (code, context) => { /* ... */ },
    },
  },
};
```

### 3.8 Agent Registration

**Currently:** Agents are auto-discovered from `agents/` dir with
`-agent.js` naming convention.

**New:** Plugins can register new agents for the orchestrator.

```js
module.exports = {
  name: "testing-agent",
  agents: {
    "tester-agent": {
      name: "tester-agent",
      version: "1.0.0",
      description: "AI agent specialized in writing tests",
      analyze: async (context, task) => { /* ... */ },
      execute: async (context, analysis) => { /* ... */ },
      review: async (context, result) => { /* ... */ },
    },
  },
};
```

### 3.9 Memory Hooks

**New concept.** Plugins can intercept memory operations — record
custom data, filter what's stored, or augment recall.

```js
module.exports = {
  name: "audit-logger",
  memoryHooks: {
    onRecordRun: async (entry) => {
      // Add custom metadata
      entry.auditTimestamp = Date.now();
    },
    onRecordMistake: async (task, error, context) => {
      // Send to external monitoring
    },
    onRecall: async (task, results) => {
      // Filter or re-rank results
      return results.filter(r => r.confidence > 0.5);
    },
  },
};
```

### 3.10 Security Hooks

**New concept.** Plugins can add custom security scanners.

```js
module.exports = {
  name: "secret-scanner",
  securityScanners: {
    "aws-keys": {
      description: "Scan for AWS access keys in code",
      scan: async (filename, content) => {
        const findings = [];
        const regex = /(?:AKIA|ASIA)[0-9A-Z]{16}/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          findings.push({
            severity: "critical",
            message: `AWS key found in ${filename}`,
            line: content.slice(0, match.index).split("\n").length,
          });
        }
        return findings;
      },
    },
  },
};
```

---

## 4. Plugin Manager — Core Engine

The Plugin Manager is the central orchestrator. It:

1. Loads plugins from multiple sources (built-in `plugins/` dir,
   npm packages, remote registries)
2. Resolves dependencies between plugins
3. Manages the plugin lifecycle (init → activate → deactivate)
4. Provides the detection engine
5. Exposes the Extension Bus for registries to connect to
6. Handles errors gracefully (a broken plugin never crashes DevOS)

```js
// plugins/manager.js — new
class PluginManager {
  constructor() {
    this._registry = new Map();      // name → plugin descriptor
    this._instances = new Map();     // name → plugin instance (after init)
    this._active = [];               // currently active plugins
    this._sources = [];              // loaders for different sources
  }

  // ── Source Registration ──────────────────────────────────
  registerSource(source) {
    // A source knows how to discover and load plugins from a
    // location. Built-in sources:
    //   - LocalSource: scans plugins/ directory
    //   - NPMSource: loads from node_modules
    //   - RegistrySource: fetches from a remote registry
    this._sources.push(source);
  }

  // ── Loading ──────────────────────────────────────────────
  async loadAll() {
    // 1. Discover plugins from all sources
    const discovered = [];
    for (const source of this._sources) {
      const plugins = await source.discover();
      discovered.push(...plugins);
    }

    // 2. Resolve dependencies
    const ordered = this._resolveDependencies(discovered);

    // 3. Validate each plugin descriptor
    for (const desc of ordered) {
      const errors = this._validate(desc);
      if (errors.length > 0) {
        console.warn(`[PLUGINS] ${desc.name}: validation failed: ${errors.join("; ")}`);
        continue;
      }
      this._registry.set(desc.name, desc);
    }

    // 4. Initialize each plugin (call onInit with config)
    for (const desc of ordered) {
      if (!this._registry.has(desc.name)) continue;
      const config = this._loadConfig(desc);
      const instance = { descriptor: desc, config };
      if (desc.hooks?.onInit) {
        try {
          await desc.hooks.onInit.call(instance, config);
        } catch (e) {
          console.warn(`[PLUGINS] ${desc.name}: init failed: ${e.message}`);
          this._registry.delete(desc.name);
          continue;
        }
      }
      this._instances.set(desc.name, instance);
    }

    // 5. Register capabilities into extension registries
    this._registerCapabilities();
  }

  // ── Detection ────────────────────────────────────────────
  detect(ctx) {
    const matched = [];
    for (const [name, instance] of this._instances) {
      const desc = instance.descriptor;
      if (!desc.detect) continue;

      const score = this._matchDetection(desc.detect, ctx);
      if (score > 0) {
        matched.push({ instance, score });
      }
    }

    matched.sort((a, b) => b.score - a.score);
    this._active = matched.map(m => m.instance);
    return this._active;
  }

  // ── Detection Matching (enhanced) ────────────────────────
  _matchDetection(rules, ctx) {
    const topFiles = (ctx.topFiles || []).map(f => f.file);
    const fileContent = topFiles.join(" ");
    const allDeps = Object.values(ctx.dependencyMap || {}).flat();
    let score = 0;
    let totalWeight = 0;

    for (const rule of rules) {
      let weight = 1;
      let pattern = rule;

      // Support { pattern, weight } objects
      if (typeof rule === "object" && rule.pattern) {
        pattern = rule.pattern;
        weight = rule.weight || 1;
      }

      // Support custom matcher functions
      if (typeof pattern === "function") {
        if (pattern(ctx)) score += weight;
        totalWeight += weight;
        continue;
      }

      totalWeight += weight;
      const match = typeof pattern === "string"
        ? fileContent.includes(pattern) || allDeps.some(d => d.includes(pattern))
        : pattern instanceof RegExp
          ? pattern.test(fileContent) || allDeps.some(d => pattern.test(d))
          : false;

      if (match) score += weight;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  // ── Hook Firing ──────────────────────────────────────────
  async fireHook(hookName, ...args) {
    const results = [];
    for (const instance of this._active) {
      if (instance.descriptor.hooks?.[hookName]) {
        try {
          const r = await instance.descriptor.hooks[hookName].call(instance, ...args);
          results.push(r);
        } catch (e) {
          console.warn(`[PLUGINS] ${instance.descriptor.name}: hook ${hookName} failed: ${e.message}`);
        }
      }
    }
    return results;
  }

  // ── Capability Registration ──────────────────────────────
  _registerCapabilities() {
    for (const [name, instance] of this._instances) {
      const desc = instance.descriptor;

      // Register tools
      if (desc.tools) {
        for (const [toolName, toolDef] of Object.entries(desc.tools)) {
          toolsRegistry.register(toolName, toolDef, name);
        }
      }

      // Register validators
      if (desc.validators) {
        for (const [valName, valDef] of Object.entries(desc.validators)) {
          validatorsRegistry.register(valName, valDef, name);
        }
      }

      // Register commands
      if (desc.commands) {
        for (const [cmdName, cmdDef] of Object.entries(desc.commands)) {
          cliRegistry.register(`${name}:${cmdName}`, cmdDef, name);
        }
      }

      // Register providers
      if (desc.providers) {
        for (const [provName, provDef] of Object.entries(desc.providers)) {
          providersRegistry.register(provName, provDef, name);
        }
      }

      // Register agents
      if (desc.agents) {
        for (const [agentName, agentDef] of Object.entries(desc.agents)) {
          agentsRegistry.register(agentName, agentDef, name);
        }
      }

      // Register security scanners
      if (desc.securityScanners) {
        for (const [scanName, scanDef] of Object.entries(desc.securityScanners)) {
          securityRegistry.register(scanName, scanDef, name);
        }
      }

      // Register memory hooks
      if (desc.memoryHooks) {
        memoryRegistry.register(name, desc.memoryHooks);
      }
    }
  }

  // ── Dependency Resolution (topological sort) ─────────────
  _resolveDependencies(plugins) {
    const graph = new Map();
    for (const p of plugins) {
      graph.set(p.name, new Set(p.dependsOn || []));
    }

    const visited = new Set();
    const ordered = [];
    const visit = (name) => {
      if (visited.has(name)) return;
      visited.add(name);
      const deps = graph.get(name) || new Set();
      for (const dep of deps) {
        if (!graph.has(dep)) {
          console.warn(`[PLUGINS] ${name}: dependency '${dep}' not found`);
        } else {
          visit(dep);
        }
      }
      ordered.push(plugins.find(p => p.name === name));
    };

    for (const p of plugins) visit(p.name);
    return ordered;
  }

  // ── Validation ───────────────────────────────────────────
  _validate(desc) {
    const errors = [];
    if (!desc.name) errors.push("missing name");
    if (typeof desc.name !== "string") errors.push("name must be a string");
    if (this._registry.has(desc.name)) errors.push(`name '${desc.name}' already registered`);
    if (desc.dependsOn && !Array.isArray(desc.dependsOn)) errors.push("dependsOn must be an array");
    if (desc.tools && typeof desc.tools !== "object") errors.push("tools must be an object");
    if (desc.validators && typeof desc.validators !== "object") errors.push("validators must be an object");
    if (desc.promptInjectors && !Array.isArray(desc.promptInjectors)) errors.push("promptInjectors must be an array");
    if (desc.contextAugmenters && !Array.isArray(desc.contextAugmenters)) errors.push("contextAugmenters must be an array");
    return errors;
  }

  // ── Configuration Loading ────────────────────────────────
  _loadConfig(desc) {
    const userConfig = DEVOS.config.plugins?.[desc.name]?.options || {};
    const schema = desc.configSchema;
    if (!schema) return userConfig;
    // Merge with defaults from JSON Schema
    return this._applyDefaults(userConfig, schema);
  }

  _applyDefaults(config, schema, path = "") {
    // Walk the schema and apply default values
    if (schema.type === "object" && schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (config[key] === undefined && prop.default !== undefined) {
          config[key] = prop.default;
        }
        if (prop.type === "object") {
          config[key] = this._applyDefaults(config[key] || {}, prop);
        }
      }
    }
    return config;
  }

  // ── Query API ────────────────────────────────────────────
  getAll() { return [...this._instances.values()]; }
  getActive() { return this._active; }
  get(name) { return this._instances.get(name)?.descriptor; }
  isActive(name) { return this._active.some(i => i.descriptor.name === name); }
  available() { return this.getAll().map(i => ({
    name: i.descriptor.name,
    version: i.descriptor.version,
    description: i.descriptor.description,
    active: this.isActive(i.descriptor.name),
  })); }
}
```

---

## 5. Plugin Sources

The Plugin Manager uses a source abstraction to load plugins from
different locations:

```js
// plugins/sources/local.js
class LocalSource {
  constructor(dir) {
    this.dir = dir;
  }

  async discover() {
    const plugins = [];
    const entries = fs.readdirSync(this.dir);

    for (const entry of entries) {
      // Single-file plugin: <name>.js
      if (entry.endsWith(".js") && entry !== "index.js" && !entry.startsWith(".")) {
        const mod = require(path.join(this.dir, entry));
        if (mod.name) {
          mod._source = "local";
          mod._file = path.join(this.dir, entry);
          plugins.push(mod);
        }
      }

      // Directory plugin: <name>/index.js
      const dirPath = path.join(this.dir, entry);
      if (fs.statSync(dirPath).isDirectory() && !entry.startsWith(".")) {
        const indexPath = path.join(dirPath, "index.js");
        if (fs.existsSync(indexPath)) {
          const mod = require(indexPath);
          if (mod.name) {
            mod._source = "local";
            mod._dir = dirPath;
            plugins.push(mod);
          }
        }
      }
    }

    return plugins;
  }
}

// plugins/sources/npm.js
class NPMSource {
  async discover() {
    // Look for packages with "devos-plugin" keyword in
    // node_modules that are listed in the config's plugins section
    const cfg = DEVOS.config.plugins || {};
    const plugins = [];

    for (const [name, options] of Object.entries(cfg)) {
      if (options.source === "npm" || !options.source) {
        try {
          const pkgPath = require.resolve(`${name}/devos-plugin.js`);
          const mod = require(pkgPath);
          if (mod.name) {
            mod._source = "npm";
            plugins.push(mod);
          }
        } catch {
          // Try the package's main export
          try {
            const mod = require(name);
            if (mod.name) plugins.push(mod);
          } catch {}
        }
      }
    }

    return plugins;
  }
}
```

---

## 6. Configuration

The `config/devos.json` gains a `plugins` section:

```json
{
  "version": "1.5.0",
  "plugins": {
    "javascript": {
      "enabled": true
    },
    "graphql": {
      "enabled": true,
      "source": "local",
      "options": {
        "strictMode": true,
        "schemaDir": "schema/"
      }
    },
    "vercel-react-best-practices": {
      "enabled": true,
      "source": "npm",
      "options": {
        "strictJSX": true
      }
    }
  }
}
```

---

## 7. Plugin SDK — Helper Module

A `@devos/plugin-sdk` module (or `plugins/sdk.js`) provides helpers:

```js
// plugins/sdk.js
module.exports = {
  // Create a tool definition
  tool: (fn, meta) => ({ run: fn, ...meta }),

  // Create a validator definition
  validator: (fn, meta) => ({ run: fn, ...meta }),

  // Create a command definition
  command: (handler, meta) => ({ handler, ...meta }),

  // Create a prompt injector
  injector: (fn, meta) => ({ run: fn, ...meta }),

  // Create a context augmenter
  augmenter: (fn, meta) => ({ run: fn, ...meta }),

  // Create a security scanner
  scanner: (fn, meta) => ({ scan: fn, ...meta }),

  // Access the logger
  getLogger: () => require("../agent/logger").get(),

  // Access the current workspace
  getWorkspace: () => require("../agent/config").workspace,

  // Access the current root
  getRoot: () => require("../agent/config").root,
};
```

---

## 8. Migration Path from v1 to v2

| v1 (Current) | v2 (New) |
|---|---|
| Static `{ name, detect, tools, rules }` | Full descriptor with lifecycle hooks |
| Single flat file `plugins/<name>.js` | File or directory with `index.js` |
| String/RegExp detect only | Weighted patterns, custom matchers |
| Tools as string references | Tool functions registered directly |
| Rules as advisory strings | Prompt injectors + context augmenters |
| No validators, commands, hooks | All extension points available |
| Hardcoded registries | Dynamic registries via Extension Bus |
| No config | Config schema + `devos.json` integration |
| No dependencies | `dependsOn` with topological resolution |
| No plugin errors handled | Validation, graceful degradation |

### Migration Steps

1. **Phase 1 — Backward compatibility:** Existing `plugins/*.js`
   files (single-file, static objects) are still loaded by the
   LocalSource. The Plugin Manager wraps them into the new format
   automatically.

2. **Phase 2 — Opt-in:** Plugins can add `hooks`, `tools`, `validators`
   alongside existing `detect`, `tools`, `rules` fields. The old
   `tools` (string array) and `rules` (string array) are automatically
   converted: `tools` → entries in the tools registry that delegate to
   the built-in tools, `rules` → a prompt injector.

3. **Phase 3 — Full v2:** Old plugins are migrated to the new format.

---

## 9. Testing

The Plugin SDK provides a test harness:

```js
// tests/plugin-test-utils.js
module.exports = {
  createMockContext: () => ({
    totalFiles: 10,
    topFiles: [
      { file: "src/schema.graphql", language: "graphql", score: 0.9 },
    ],
    dependencyMap: {
      "src/index.js": ["graphql", "apollo-server"],
    },
    workspace: "/tmp/test-workspace",
    modifiedFiles: ["src/schema.graphql"],
  }),

  createMockPluginManager: () => {
    // Returns a fresh PluginManager with no plugins loaded
    const PluginManager = require("../plugins/manager");
    return new PluginManager();
  },

  assertPluginDetection: (plugin, ctx, expectedActive) => {
    const pm = createMockPluginManager();
    pm._instances.set(plugin.name, { descriptor: plugin, config: {} });
    pm.detect(ctx);
    assert.equal(pm.isActive(plugin.name), expectedActive);
  },

  assertToolWorks: async (toolDef, args, ctx, expected) => {
    const result = await toolDef.run(args, ctx);
    assert.equal(result.ok, expected.ok);
    if (expected.data !== undefined) assert.equal(result.data, expected.data);
  },
};
```

---

## 10. Summary of Extension Points

| Extension Point | What It Does | When It Runs |
|---|---|---|
| `detect` | Activates plugin based on project context | Context build |
| `tools` | Registers executable tools | Plugin load |
| `validators` | Registers validation steps | Validation phase |
| `commands` | Registers CLI subcommands | CLI startup |
| `contextAugmenters` | Adds data to context object | Context build |
| `promptInjectors` | Injects text into AI system prompt | Before reasoning |
| `hooks.onInit` | Plugin initialization | Plugin load |
| `hooks.onActivate` | Plugin activation | After detection |
| `hooks.onBeforeReason` | Before AI reasoning | Pipeline |
| `hooks.onAfterPlan` | After AI plan created | Pipeline |
| `hooks.onBeforeExecute` | Before execution | Pipeline |
| `hooks.onAfterExecute` | After execution | Pipeline |
| `hooks.onHeal` | During healing | Healing phase |
| `hooks.onComplete` | Pipeline complete | Pipeline end |
| `hooks.onDeactivate` | Cleanup | Shutdown |
| `providers` | Registers AI providers | Plugin load |
| `agents` | Registers AI agents | Plugin load |
| `memoryHooks` | Intercepts memory operations | Memory operations |
| `securityScanners` | Adds security checks | Security scan |
| `configSchema` | Defines configuration schema | Plugin load |