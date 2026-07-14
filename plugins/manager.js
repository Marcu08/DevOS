const fs = require("fs");
const path = require("path");

const PLUGINS_DIR = __dirname;
const MARKETPLACE_FILE = path.join(PLUGINS_DIR, "marketplace.json");
const INSTALLED_FILE = path.join(PLUGINS_DIR, ".installed.json");

const DEFAULT_MARKETPLACE = [
  { name: "javascript", version: "1.0.0", description: "JavaScript project detection and tooling", url: "", capabilities: ["lint", "build"] },
  { name: "python", version: "1.0.0", description: "Python project detection and tooling", url: "", capabilities: ["lint", "test"] },
  { name: "react", version: "1.0.0", description: "React project detection and tooling", url: "", capabilities: ["lint", "build", "test"] },
  { name: "docker", version: "1.0.0", description: "Docker project detection and tooling", url: "", capabilities: ["container"] },
  { name: "security", version: "1.0.0", description: "Enhanced security scanning rules and tools", url: "", capabilities: ["security", "validation"] },
  { name: "typescript", version: "1.0.0", description: "TypeScript project detection and tooling", url: "", capabilities: ["lint", "build"] },
  { name: "rust", version: "1.0.0", description: "Rust project detection and tooling", url: "", capabilities: ["build", "test"] },
  { name: "go", version: "1.0.0", description: "Go project detection and tooling", url: "", capabilities: ["build", "test", "lint"] },
  { name: "ruby", version: "1.0.0", description: "Ruby project detection and tooling", url: "", capabilities: ["test", "lint"] },
  { name: "php", version: "1.0.0", description: "PHP project detection and tooling", url: "", capabilities: ["test", "lint"] },
];

const VALID_PLUGIN_KEYS = new Set([
  "name", "version", "description", "detect", "tools", "rules",
  "contextAugmenters", "promptInjectors",
  "hooks", "commands", "validators",
  "dependsOn", "configSchema", "providers", "agents",
  "memoryHooks", "securityScanners",
]);

class PluginManager {
  constructor() {
    this._registry = new Map();
    this._active = [];
    this._loaded = false;
    this._warnings = [];
  }

  // ── Public API ─────────────────────────────────────────────

  get(name) {
    this._ensureLoaded();
    return this._registry.get(name)?.descriptor || null;
  }

  getAll() {
    this._ensureLoaded();
    return [...this._registry.values()].map(e => e.descriptor);
  }

  getActive() {
    return this._active;
  }

  isActive(name) {
    return this._active.some(p => p.descriptor.name === name);
  }

  available() {
    this._ensureLoaded();
    return [...this._registry.values()].map(e => ({
      name: e.descriptor.name,
      version: e.descriptor.version || "1.0.0",
      description: e.descriptor.description || "",
    }));
  }

  getWarnings() {
    return this._warnings;
  }

  // ── Detection ──────────────────────────────────────────────

  detect(ctx) {
    this._ensureLoaded();
    const topFiles = (ctx.topFiles || []).map(f => f.file);
    const content = topFiles.join(" ");
    const deps = ctx.dependencyMap || {};
    const allDeps = Object.values(deps).flat();

    const matched = [];
    for (const [name, entry] of this._registry) {
      const desc = entry.descriptor;
      if (!desc.detect) continue;

      const rules = Array.isArray(desc.detect) ? desc.detect : [desc.detect];
      let matchCount = 0;
      for (const rule of rules) {
        if (typeof rule === "string") {
          if (content.includes(rule) || allDeps.some(d => d.includes(rule))) matchCount++;
        } else if (rule instanceof RegExp) {
          if (rule.test(content) || allDeps.some(d => rule.test(d))) matchCount++;
        }
      }
      if (matchCount > 0) {
        matched.push({ descriptor: desc, score: matchCount / rules.length, matchCount });
      }
    }

    matched.sort((a, b) => b.score - a.score);
    this._active = matched.map(m => this._registry.get(m.descriptor.name));
    return this._active;
  }

  // ── Backward Compat: v1-style detection results ────────────

  detectPlugins(ctx) {
    const active = this.detect(ctx);
    return active.map(e => ({
      plugin: e.descriptor,
      score: e.descriptor._detectionScore || 0,
      matchCount: e.descriptor._detectionMatchCount || 0,
    }));
  }

  getEnabledTools(ctx) {
    this.detect(ctx);
    const tools = new Set();
    for (const entry of this._active) {
      const desc = entry.descriptor;
      if (desc.tools) {
        for (const t of desc.tools) tools.add(t);
      }
    }
    return [...tools];
  }

  getProjectRules(ctx) {
    this.detect(ctx);
    const rules = [];
    for (const entry of this._active) {
      const desc = entry.descriptor;
      if (desc.rules) rules.push(...desc.rules);
    }
    return rules;
  }

  getManifest(pluginName) {
    const desc = this.get(pluginName);
    if (!desc) return null;
    return {
      name: desc.name,
      version: desc.version || "1.0.0",
      description: desc.description || "",
      capabilities: desc.tools || [],
      validators: desc.rules || [],
      detect: desc.detect || [],
    };
  }

  // ── Context Augmenters ─────────────────────────────────────

  getContextAugmenters(ctx) {
    this.detect(ctx);
    const augmenters = [];
    for (const entry of this._active) {
      const desc = entry.descriptor;
      if (desc.contextAugmenters) {
        for (const aug of desc.contextAugmenters) {
          augmenters.push({ name: desc.name, run: aug.run || aug });
        }
      }
    }
    return augmenters;
  }

  async runContextAugmenters(ctx) {
    const augmenters = this.getContextAugmenters(ctx);
    for (const aug of augmenters) {
      try {
        const result = await aug.run(ctx);
        if (result) ctx = result;
      } catch (e) {
        console.warn(`[PLUGINS] Context augmenter '${aug.name}' failed: ${e.message}`);
      }
    }
    return ctx;
  }

  // ── Prompt Injectors ───────────────────────────────────────

  getPromptInjectors(ctx) {
    this.detect(ctx);
    const injectors = [];
    for (const entry of this._active) {
      const desc = entry.descriptor;

      if (desc.promptInjectors) {
        for (const inj of desc.promptInjectors) {
          injectors.push({ name: desc.name, run: inj.run || inj });
        }
      }

      if (desc.rules && desc.rules.length > 0) {
        const rules = [...desc.rules];
        injectors.push({
          name: desc.name,
          run: async () => rules.join("\n"),
        });
      }
    }
    return injectors;
  }

  async collectPromptInjections(ctx) {
    const injectors = this.getPromptInjectors(ctx);
    const parts = [];
    for (const inj of injectors) {
      try {
        const text = await inj.run(ctx);
        if (text) parts.push(text);
      } catch (e) {
        console.warn(`[PLUGINS] Prompt injector '${inj.name}' failed: ${e.message}`);
      }
    }
    return parts;
  }

  // ── Internal: Loading ──────────────────────────────────────

  _ensureLoaded() {
    if (!this._loaded) {
      this._loadAll();
      this._loaded = true;
    }
  }

  reload() {
    this._loaded = false;
    this._registry.clear();
    this._active = [];
    this._warnings = [];
    this._ensureLoaded();
  }

  _loadAll() {
    const files = this._discover();
    for (const file of files) {
      try {
        const desc = require(file.path);
        if (!desc || !desc.name) {
          this._warnings.push(`Skipped ${file.name}: missing 'name' property`);
          continue;
        }

        const errors = this._validate(desc);
        if (errors.length > 0) {
          this._warnings.push(`Plugin '${desc.name}' (${file.name}): ${errors.join("; ")}`);
          continue;
        }

        const isV1 = this._isV1Plugin(desc);
        if (isV1) {
          this._warnings.push(`Plugin '${desc.name}' (${file.name}): loaded as v1 (static) format — consider upgrading to v2 for context augmenters and prompt injectors`);
        }

        this._registry.set(desc.name, { descriptor: desc, file: file.path, isV1 });
      } catch (e) {
        this._warnings.push(`Failed to load ${file.name}: ${e.message}`);
      }
    }
  }

  _discover() {
    const results = [];
    const entries = fs.readdirSync(PLUGINS_DIR);

    for (const entry of entries) {
      const fullPath = path.join(PLUGINS_DIR, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isFile() && entry.endsWith(".js") && entry !== "index.js" && !entry.startsWith(".") && entry !== "SKILL.md") {
        results.push({ name: entry, path: fullPath });
      }

      if (stat.isDirectory() && !entry.startsWith(".") && entry !== "node_modules" && entry !== "registry") {
        const indexPath = path.join(fullPath, "index.js");
        if (fs.existsSync(indexPath)) {
          results.push({ name: `${entry}/index.js`, path: indexPath });
        }
      }
    }

    return results;
  }

  // ── Validation ─────────────────────────────────────────────

  _validate(desc) {
    const errors = [];
    if (typeof desc.name !== "string" || desc.name.length === 0) {
      errors.push("'name' must be a non-empty string");
    }
    if (this._registry.has(desc.name)) {
      errors.push(`duplicate name '${desc.name}'`);
    }
    if (desc.version !== undefined && typeof desc.version !== "string") {
      errors.push("'version' must be a string");
    }
    if (desc.detect !== undefined) {
      if (!Array.isArray(desc.detect)) {
        errors.push("'detect' must be an array");
      } else {
        for (const rule of desc.detect) {
          if (typeof rule !== "string" && !(rule instanceof RegExp) && typeof rule !== "function") {
            errors.push(`'detect' contains invalid rule type: ${typeof rule}`);
            break;
          }
        }
      }
    }
    if (desc.tools !== undefined && !Array.isArray(desc.tools)) {
      errors.push("'tools' must be an array");
    }
    if (desc.rules !== undefined && !Array.isArray(desc.rules)) {
      errors.push("'rules' must be an array");
    }
    if (desc.contextAugmenters !== undefined) {
      if (!Array.isArray(desc.contextAugmenters)) {
        errors.push("'contextAugmenters' must be an array");
      }
    }
    if (desc.promptInjectors !== undefined) {
      if (!Array.isArray(desc.promptInjectors)) {
        errors.push("'promptInjectors' must be an array");
      }
    }

    for (const key of Object.keys(desc)) {
      if (!VALID_PLUGIN_KEYS.has(key)) {
        errors.push(`unknown field '${key}'`);
      }
    }

    return errors;
  }

  _isV1Plugin(desc) {
    return !desc.contextAugmenters && !desc.promptInjectors && !desc.hooks;
  }
}

// ── Marketplace & Management (static, kept from v1) ──────────

function ensureMarketplace() {
  if (!fs.existsSync(MARKETPLACE_FILE)) {
    fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(DEFAULT_MARKETPLACE, null, 2));
  }
}

function searchMarketplace(query) {
  ensureMarketplace();
  const entries = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf-8"));
  const q = query.toLowerCase();
  return entries.filter(e =>
    e.name.toLowerCase().includes(q) ||
    (e.description || "").toLowerCase().includes(q) ||
    (e.capabilities || []).some(c => c.includes(q))
  );
}

function getInstalled() {
  if (!fs.existsSync(INSTALLED_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(INSTALLED_FILE, "utf-8")); } catch { return []; }
}

function saveInstalled(list) {
  fs.writeFileSync(INSTALLED_FILE, JSON.stringify(list, null, 2));
}

function templatePlugin(name, entry) {
  const caps = JSON.stringify(entry.capabilities || []);
  const tpl = `module.exports = {
  name: "${name}",
  version: "${entry.version || "1.0.0"}",
  description: "${entry.description || name + " plugin"}",
  capabilities: ${caps},
  detect: [],
  tools: [],
  rules: [],
};
`;
  fs.writeFileSync(path.join(PLUGINS_DIR, `${name}.js`), tpl);
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0, vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function install(pluginName) {
  const entries = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf-8"));
  const entry = entries.find(e => e.name === pluginName);
  if (!entry) return { error: true, message: `Plugin '${pluginName}' not found in marketplace` };
  const installed = getInstalled();
  if (installed.some(i => i.name === pluginName)) return { error: false, message: `Plugin '${pluginName}' already installed` };
  const pluginPath = path.join(PLUGINS_DIR, `${pluginName}.js`);
  if (fs.existsSync(pluginPath)) {
    installed.push({ name: pluginName, version: entry.version, installed: new Date().toISOString() });
    saveInstalled(installed);
    return { error: false, message: `Plugin '${pluginName}' already available, marked as installed` };
  }
  templatePlugin(pluginName, entry);
  installed.push({ name: pluginName, version: entry.version, installed: new Date().toISOString() });
  saveInstalled(installed);
  return { error: false, message: `Plugin '${pluginName}' installed successfully` };
}

function uninstall(pluginName) {
  let installed = getInstalled();
  const idx = installed.findIndex(i => i.name === pluginName);
  if (idx === -1) return { error: true, message: `Plugin '${pluginName}' is not installed` };
  installed.splice(idx, 1);
  saveInstalled(installed);
  return { error: false, message: `Plugin '${pluginName}' uninstalled` };
}

function remove(pluginName) {
  const uninst = uninstall(pluginName);
  if (uninst.error) return uninst;
  const pluginPath = path.join(PLUGINS_DIR, `${pluginName}.js`);
  if (fs.existsSync(pluginPath)) {
    try { fs.unlinkSync(pluginPath); return { error: false, message: `Plugin '${pluginName}' removed from filesystem` }; }
    catch (e) { return { error: true, message: `Failed to remove file: ${e.message}` }; }
  }
  return { error: false, message: `Plugin '${pluginName}' uninstalled (file not found)` };
}

function update(pluginName) {
  const entries = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf-8"));
  const entry = entries.find(e => e.name === pluginName);
  if (!entry) return { error: true, message: `Plugin '${pluginName}' not found in marketplace` };
  const installed = getInstalled();
  const idx = installed.findIndex(i => i.name === pluginName);
  if (idx === -1) return { error: true, message: `Plugin '${pluginName}' is not installed` };
  const current = installed[idx];
  const cmp = compareVersions(current.version, entry.version);
  if (cmp >= 0) return { error: false, message: `Plugin '${pluginName}' is already at latest version (${current.version})` };
  installed[idx].version = entry.version;
  installed[idx].updated = new Date().toISOString();
  saveInstalled(installed);
  templatePlugin(pluginName, entry);
  return { error: false, message: `Plugin '${pluginName}' updated from ${current.version} to ${entry.version}` };
}

function publish(pluginName, manifest) {
  ensureMarketplace();
  const entries = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf-8"));
  const idx = entries.findIndex(e => e.name === pluginName);
  const entry = { name: pluginName, version: manifest.version || "1.0.0", description: manifest.description || "", url: manifest.url || "", capabilities: manifest.capabilities || [] };
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(entries, null, 2));
  return { error: false, message: `Plugin '${pluginName}' published to marketplace` };
}

function checkCompatibility(pluginName) {
  const pm = getInstance();
  const manifest = pm.getManifest(pluginName);
  if (!manifest) return { compatible: false, reason: "Plugin not found" };
  const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf-8"));
  const entry = marketplace.find(e => e.name === pluginName);
  if (!entry) return { compatible: true, reason: "Local only" };
  const cmp = compareVersions(manifest.version, entry.version);
  if (cmp < 0) return { compatible: true, reason: `Update available: ${manifest.version} \u2192 ${entry.version}`, updateAvailable: true, latest: entry.version };
  return { compatible: true, reason: "Up to date" };
}

// ── Singleton ─────────────────────────────────────────────────

let _instance = null;

function getInstance() {
  if (!_instance) {
    _instance = new PluginManager();
  }
  return _instance;
}

function resetInstance() {
  _instance = null;
}

module.exports = {
  PluginManager,
  getInstance,
  resetInstance,
  searchMarketplace,
  install,
  uninstall,
  remove,
  update,
  publish,
  checkCompatibility,
  getInstalled,
  ensureMarketplace,
};