# DevOS Plugin Development

Create a production-ready DevOS plugin from scratch.

## What You'll Build

A DevOS plugin is a Node.js module that teaches DevOS how to detect,
analyze, and work with a specific technology or pattern. When a project
matches a plugin's detection rules, DevOS activates its tools and rules
to guide the AI agent's decisions.

By the end of this skill you will have:

- A working plugin file with detection rules, tools, and validation rules
- An understanding of the plugin lifecycle
- Your plugin registered in the marketplace
- Integration tests verifying it works

## How Plugins Work

DevOS uses the **PluginManager** (`plugins/manager.js`) to discover,
load, validate, and detect plugins. It supports two formats:

- **Single file:** `plugins/<name>.js` — exports a descriptor object
- **Directory:** `plugins/<name>/index.js` — exports a descriptor object

Files are loaded with `require()` and added to the internal registry
if they export a valid `name` property. The PluginManager caches all
loaded plugins and is the single source of truth for plugin state.

### Plugin Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. File placed in plugins/                           │
│    (or installed via `node cli.js plugins install`)  │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 2. loadAll() scans plugins/*.js, require() each      │
│    Skips: index.js, dotfiles, files without .name    │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 3. detectPlugins(context) matches plugin.detect      │
│    rules against topFiles + dependencyMap             │
│    Returns: [{plugin, score, matchCount}] sorted     │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 4. getEnabledTools(context) collects .tools from     │
│    all matched plugins into a Set                    │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 5. getProjectRules(context) concatenates .rules from │
│    all matched plugins into a list                   │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ 6. Context object gets:                               │
│    ctx.activePlugins  — names of matched plugins     │
│    ctx.enabledTools   — union of all tools           │
│    ctx.projectRules   — combined rules list          │
└─────────────────────────────────────────────────────┘
```

### When Plugins Activate

Plugin detection happens once per run, during `context.build()` in
`agent/pipeline/context.js`. The context is built at the start of both
single-agent (`run()`) and multi-agent (`orchestrate()`) pipelines.

## Required Plugin Interface (v1 — Static)

Every plugin file must export a plain object with these properties:

```js
module.exports = {
  // ── Required ──────────────────────────────────────
  name: "my-plugin",          // Unique identifier. Used for install,
                              // uninstall, and marketplace lookups.

  // ── Optional but recommended ──────────────────────
  version: "1.0.0",           // Semver string. Compared during
                              // marketplace updates.

  description: "Does X",      // Shown in `node cli.js plugins` and
                              // `node cli.js plugins info <name>`.

  // ── Detection rules (optional) ────────────────────
  // Controls when this plugin activates. Matched against
  // ctx.topFiles[].file (filenames) and ctx.dependencyMap
  // (imported module names). Scoring: matchCount / rules.length.
  // Higher score = higher priority in detection results.
  detect: [
    ".myext",                 // String: substring match against
                              //   filenames and dependency names
    /my-pattern-\w+/i,        // RegExp: test() against filenames
                              //   and dependency names
  ],

  // ── Tools to enable (optional) ────────────────────
  // These are added to ctx.enabledTools when the plugin
  // is detected. Tools must exist in agent/tools/index.js.
  // Currently available: eslint, lint, npm, install, test,
  // tests, doctor
  tools: ["eslint", "npm"],

  // ── Project rules (optional) ──────────────────────
  // These are added to ctx.projectRules when the plugin
  // is detected. Rules are advisory strings shown to the
  // AI agent as project guidelines.
  rules: [
    "Run `npm install` before validation",
    "Use `node --check` for syntax validation",
  ],
};
```

## V2 Plugin Features (Extending v1)

In addition to the v1 fields, you can add runtime capabilities:

### Context Augmenters

Context augmenters enrich the context object before the AI sees it.
They are async functions that receive and can modify the context.

```js
module.exports = {
  name: "my-plugin",
  detect: [".myext"],

  // Called after detection, during context.build()
  // Each augmenter can mutate ctx with domain-specific data
  contextAugmenters: [
    {
      name: "inject-config-summary",
      description: "Adds project config summary to context",
      run: async (ctx) => {
        const configFiles = ctx.topFiles
          .filter(f => f.file.endsWith(".myext"))
          .map(f => ({ file: f.file }));
        ctx.myPlugin = { configFiles };
        return ctx;
      },
    },
  ],
};
```

### Prompt Injectors

Prompt injectors teach the AI about project-specific conventions by
injecting text into the system prompt. They are async functions that
return strings.

```js
module.exports = {
  name: "my-plugin",
  detect: [".myext"],

  // Called during prompt building, output is appended to
  // the "Project Rules" section of the AI prompt
  promptInjectors: [
    {
      name: "my-plugin-rules",
      description: "Project conventions for the AI agent",
      run: async (ctx) => {
        return [
          "Always validate .myext files before committing",
          "Use the project's custom linter for .myext files",
        ].join("\n");
      },
    },
  ],
};
```

**Note:** V1 plugins with a `rules` array are automatically detected
and their rules are converted to a prompt injector. No migration is
required.

## Detection Rule Details

The `detect` array is matched by `detectPlugins(context)` in
`plugins/index.js:40-64`. The matching logic:

```js
// For each plugin with a detect array:
let matchCount = 0;
for (const rule of plugin.detect) {
  if (typeof rule === "string") {
    // Does any filename or dependency contain this string?
    if (filename.includes(rule) || dependency.includes(rule))
      matchCount++;
  } else if (rule instanceof RegExp) {
    // Does any filename or dependency match this regex?
    if (rule.test(filename) || rule.test(dependency))
      matchCount++;
  }
}
// score = matchCount / rules.length
```

### Tips for Good Detection

- **Use filenames** for project-type detection: `"package.json"`,
  `"Dockerfile"`, `".csproj"`
- **Use file extensions** for language detection: `".py"`, `".rs"`,
  `".go"`
- **Use dependency names** for framework detection: `"react"`,
  `"express"`, `"next"`
- **Use RegExp** for partial patterns: `/\.spec\.(js|ts)$/` to detect
  test files, `/^@angular\//` to detect Angular packages
- **Be specific** — a rule like `"react"` will match both `react` and
  `react-dom` dependencies, but also any file named `"react-something"`
- **Multiple rules increase precision** — detecting both `"Dockerfile"`
  AND `"docker-compose.yml"` is stronger than either alone

## Step-by-Step: Create a Plugin

### Step 1: Define what you want to detect

Decide on the technology or pattern. Check the marketplace first to
avoid duplication:

```
node cli.js plugins search <query>
```

### Step 2: Create the plugin file

Create a file in `plugins/` named `<your-plugin>.js`:

```js
// plugins/rust.js
module.exports = {
  name: "rust",
  version: "1.0.0",
  description: "Rust project detection and tooling",
  detect: [".rs", "Cargo.toml"],
  tools: ["build", "test"],
  rules: [
    "Run `cargo check` before building",
    "Use `cargo test` to verify changes",
    "Run `cargo clippy` for linting",
  ],
};
```

### Step 3: Verify it loads

```
node cli.js plugins
```

You should see your plugin in the list. If not, check for errors in the
console — `loadAll()` logs load failures via `console.error`.

### Step 4: Test detection

The plugin is automatically detected when the context is built. To test
detection manually, run the pipeline in a matching project:

```
node cli.js run "fix build errors"
```

The log output will show:
```
[CTX] Detected plugins: javascript, react, <your-plugin>
```

### Step 5: Register in the marketplace

Add your entry to `plugins/marketplace.json`:

```json
{
  "name": "rust",
  "version": "1.0.0",
  "description": "Rust project detection and tooling",
  "url": "",
  "capabilities": ["build", "test"]
}
```

Or use the publish API from a script:

```js
const plugins = require("./plugins/index");
plugins.publish("rust", {
  version: "1.0.0",
  description: "Rust project detection and tooling",
  capabilities: ["build", "test"],
});
```

### Step 6: Write tests

Add a test to `tests/plugins.test.js` or create a new test file:

```js
module.exports = function test(assert) {
  const plugins = require("../plugins/index");

  // Verify it loads
  const available = plugins.available();
  assert.ok(available.some(p => p.name === "rust"),
    "rust plugin should be available");

  // Verify manifest
  const manifest = plugins.getManifest("rust");
  assert.equal(manifest.name, "rust");
  assert.equal(manifest.version, "1.0.0");
  assert.ok(manifest.capabilities.includes("build"));

  // Verify detection
  const ctx = {
    topFiles: [{ file: "src/main.rs" }, { file: "Cargo.toml" }],
    dependencyMap: {},
  };
  const detected = plugins.detectPlugins(ctx);
  assert.ok(detected.some(d => d.plugin.name === "rust"),
    "should detect rust project");

  // Verify tools and rules are collected
  const tools = plugins.getEnabledTools(ctx);
  assert.ok(tools.includes("build"), "should enable build tool");
  assert.ok(tools.includes("test"), "should enable test tool");

  const rules = plugins.getProjectRules(ctx);
  assert.ok(rules.some(r => r.includes("cargo check")),
    "should include cargo check rule");
};
```

Run tests:
```
node tests/runner.js
```

## Production Example: A Complete Plugin

Here is a plugin for a hypothetical GraphQL codebase. It demonstrates
all supported features:

```js
// plugins/graphql.js
module.exports = {
  name: "graphql",
  version: "1.2.0",
  description: "GraphQL schema and resolver detection, linting, and validation rules",

  // Detect GraphQL projects by file extensions, config files,
  // and common dependency names
  detect: [
    ".graphql",
    ".gql",
    "graphql.config.js",
    "graphql.config.ts",
    /^graphql(-|$)/,
    /^@graphql-/,
    "apollo-server",
    "relay-runtime",
  ],

  // Tools that DevOS should run for this project
  tools: ["npm", "eslint", "test"],

  // Rules injected into the project context for the AI agent
  rules: [
    "Use `graphql-inspector` to validate schema changes",
    "Run `npm test` to verify resolvers and integration tests",
    "Check for missing `@deprecated` directives on removed fields",
    "Ensure all resolver return types match the schema type",
    "Validate pagination arguments follow the Relay Connection spec",
    "Run `npx eslint . --ext .js,.ts,.graphql` for linting",
    "Keep schema files under `schema/` directory",
  ],
};
```

## Marketplace Entry

```json
{
  "name": "graphql",
  "version": "1.2.0",
  "description": "GraphQL schema and resolver detection, linting, and validation rules",
  "url": "",
  "capabilities": ["lint", "test", "schema"]
}
```

## Advanced: When to Create a Plugin vs. a Custom Tool

| Feature | Plugin | Custom Tool |
|---------|--------|-------------|
| Detection-based activation | Yes | No |
| Project rules for AI agent | Yes | No |
| Running shell commands | No | Yes |
| Executing during validation | No | Yes |
| Retry logic | No | Yes |
| Returning structured results | No | Yes |

**Create a plugin** when you want to teach DevOS about a technology:
what files to look for, what tools to use, what rules to follow.

**Create a custom tool** (in `agent/tools/`) when you need to execute
logic during the pipeline — linting, building, testing, or any
side-effect that produces structured output.

## Common Mistakes

### 1. Missing `name` property
The plugin is skipped with a warning. The PluginManager logs:
```
Skipped <file>: missing 'name' property
```

### 2. Using a name that already exists
Plugin names must be unique. The PluginManager logs:
```
Plugin '<name>': duplicate name '<name>'
```
The duplicate is skipped.

### 3. Valid plugin fields
The PluginManager validates known fields. Currently valid:
`name`, `version`, `description`, `detect`, `tools`, `rules`,
`contextAugmenters`, `promptInjectors`, `hooks`, `commands`,
`validators`, `dependsOn`, `configSchema`, `providers`, `agents`,
`memoryHooks`, `securityScanners`

Unknown fields generate a warning but do not block loading.

### 4. Detection rules that are too broad
A `detect` rule of `"js"` will match EVERY file with `.js` in the
name, even `"package.json"` or `"somejs.js"`. Use specific strings
like `".js"` (with the dot) or specific filenames.

### 5. Referencing tools that don't exist
The `tools` array is advisory. If a tool name doesn't exist in
`agent/tools/index.js`, it's silently ignored when `getEnabledTools()`
returns the set. No error is raised.

### 6. Forgetting to reload during development
`loadAll()` caches results. If you edit a plugin file while DevOS
is running, the changes won't take effect until the process restarts
or `loaded` is set to `null`.

## Plugin API Reference

### `plugins/manager.js` PluginManager API

| Method | Purpose |
|--------|---------|
| `get(name)` | Get a single plugin descriptor |
| `getAll()` | Get all loaded plugin descriptors |
| `getActive()` | Get currently active (detected) plugins |
| `isActive(name)` | Check if a plugin is active for current context |
| `detect(context)` | Detect active plugins, returns instances |
| `available()` | List all plugins with name, version, description |
| `getManifest(pluginName)` | Get v1-style manifest for a plugin |
| `getWarnings()` | Get validation and load warnings |
| `reload()` | Clear cache and reload all plugins |
| `getContextAugmenters(context)` | Get augmenters from active plugins |
| `runContextAugmenters(context)` | Execute all augmenters on context |
| `getPromptInjectors(context)` | Get injectors from active plugins |
| `collectPromptInjections(context)` | Execute all injectors, return strings |

### `plugins/index.js` Exports (Backward Compatible)

| Function | Purpose |
|----------|---------|
| `loadAll()` | Load all plugin files from `plugins/` directory |
| `detectPlugins(context)` | Match plugins against project context |
| `getEnabledTools(context)` | Union of all matched plugin tools |
| `getProjectRules(context)` | Concatenation of all matched plugin rules |
| `available()` | List all loaded plugins with name, version, description |
| `getManifest(pluginName)` | Get full plugin export object |
| `searchMarketplace(query)` | Search marketplace.json entries |
| `install(pluginName)` | Create template file from marketplace entry |
| `uninstall(pluginName)` | Remove from installed list |
| `remove(pluginName)` | Uninstall + delete file |
| `update(pluginName)` | Regenerate file from marketplace entry |
| `publish(pluginName, manifest)` | Add/update marketplace entry |
| `checkCompatibility(pluginName)` | Compare local vs marketplace version |
| `getInstalled()` | List installed plugins |

### Context Object (what detectPlugins receives)

```js
{
  timestamp: "2026-07-14T...",
  totalFiles: 42,
  topFiles: [
    { file: "src/index.js", language: "javascript", score: 0.95, complexity: {...} },
    { file: "package.json", language: "json", score: 0.90, complexity: {...} },
    // ... up to 20 entries
  ],
  dependencyMap: {
    "src/index.js": ["react", "react-dom", "lodash"],
    // ... one entry per file
  },
  exportsMap: {
    "src/utils.js": ["calculateTotal", "formatDate"],
    // ... only files with exports
  },
}
```

## Architecture Status (v2.0.0)

The Plugin Framework v2.0.0 introduces the PluginManager, extension
registries, context augmenters, and prompt injectors. The following
gaps remain for future releases:

### Gap 1: Plugin-driven tools (v2.0.0 — Partial)

**Status:** ToolsRegistry exists as an abstraction layer. Plugin
tools can be registered, but the executor does not yet use them
automatically. Plugin tool registration is API-ready for future use.

### Gap 2: Plugin-driven validators (v2.0.0 — Partial)

**Status:** ValidatorsRegistry exists with plugin validator support.
Plugin validators run after built-in validators during validation.
The validator system is now extensible via the registry.

### Gap 3: No lifecycle hooks

**Status:** Not yet implemented. The PluginManager has extension
points prepared for hooks (`hooks` field in the descriptor) but
the pipeline does not fire them yet. Future versions will add
`onInit`, `onActivate`, `onBeforeReason`, `onAfterPlan`, etc.

### Gap 4: No plugin configuration

**Problem:** Plugins cannot accept user configuration. The `devos.json`
config file has no `plugins` section.

**Fix:** Add a `plugins` section to `config/devos.json`:

```json
{
  "plugins": {
    "my-plugin": {
      "enabled": true,
      "options": { "key": "value" }
    }
  }
}
```

### Gap 5: Plugin data directories

**Status:** v2.0.0 supports both `plugins/name.js` and
`plugins/name/index.js` formats. Directory plugins can include
assets, sub-modules, and templates.

### Gap 6: `enabledTools` and `projectRules` consumption

**Status:** `ctx.projectRules` is now consumed by the AI prompt
builder (via Prompt Injectors). `ctx.enabledTools` is still not
consumed by the executor — this is a future improvement.
should merge plugin validators alongside built-in ones.

### Gap 3: No lifecycle hooks

**Problem:** Plugins are static data objects. They cannot run code
at any point in the pipeline.

**Fix:** Add optional lifecycle methods to the plugin interface:

```js
module.exports = {
  name: "my-plugin",
  // ... existing fields ...

  // Called when the plugin is loaded
  init(config) { /* ... */ },

  // Called after detection completes
  onDetect(context) { /* modify context */ },

  // Called before validation
  onValidate(context) { /* add checks */ },

  // Called after execution completes
  onComplete(result) { /* log, report, etc. */ },
};
```

### Gap 4: No plugin configuration

**Problem:** Plugins cannot accept user configuration. The `devos.json`
config file has no `plugins` section.

**Fix:** Add a `plugins` section to `config/devos.json`:

```json
{
  "plugins": {
    "my-plugin": {
      "enabled": true,
      "options": { "key": "value" }
    }
  }
}
```

Pass this configuration to the plugin's `init()` method.

### Gap 5: No plugin data directory

**Problem:** All plugins live as flat files in `plugins/`. There's no
way to include assets, templates, or sub-modules.

**Fix:** Support plugin directories in addition to single files. A
directory `plugins/my-plugin/index.js` would be loaded as `my-plugin`
and have access to sibling files.

### Gap 6: `enabledTools` and `projectRules` are unused

**Problem:** These are set on the context object but never consumed by
the executor, validator, or AI agent.

**Fix:** Pass `ctx.projectRules` to the AI provider as part of the
system prompt, so the agent sees project-specific rules. Pass
`ctx.enabledTools` to the executor to filter which tools are
available during pipeline execution.

## Summary

| Step | What to Do |
|------|------------|
| 1 | Create `plugins/<name>.js` with `name`, `version`, `description` |
| 2 | Add `detect` rules (strings or RegExps matching filenames/deps) |
| 3 | Add `tools` array referencing entries in `agent/tools/index.js` |
| 4 | Add `rules` array with natural-language project guidelines |
| 5 | Register in `plugins/marketplace.json` |
| 6 | Add tests in `tests/plugins.test.js` |
| 7 | Run `node cli.js plugins` to verify it loads |
| 8 | Run `node tests/runner.js` to verify tests pass |