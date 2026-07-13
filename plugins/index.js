const fs = require("fs");
const path = require("path");

const PLUGINS_DIR = __dirname;
const MARKETPLACE_FILE = path.join(PLUGINS_DIR, "marketplace.json");
const INSTALLED_FILE = path.join(PLUGINS_DIR, ".installed.json");

let loaded = null;

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

function loadAll() {
  if (loaded) return loaded;
  loaded = [];
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".js") && f !== "index.js" && !f.startsWith("."));
  for (const file of files) {
    try {
      const plugin = require(path.join(PLUGINS_DIR, file));
      if (plugin.name) {
        loaded.push(plugin);
      }
    } catch (e) {
      console.error(`[PLUGINS] Failed to load ${file}: ${e.message}`);
    }
  }
  return loaded;
}

function detectPlugins(context) {
  const plugins = loadAll();
  const topFiles = (context.topFiles || []).map(f => f.file);
  const content = topFiles.join(" ");
  const deps = context.dependencyMap || {};
  const allDeps = Object.values(deps).flat();

  const matched = [];
  for (const plugin of plugins) {
    if (!plugin.detect) continue;
    const rules = Array.isArray(plugin.detect) ? plugin.detect : [plugin.detect];
    let matchCount = 0;
    for (const rule of rules) {
      if (typeof rule === "string") {
        if (content.includes(rule) || allDeps.some(d => d.includes(rule))) matchCount++;
      } else if (rule instanceof RegExp) {
        if (rule.test(content) || allDeps.some(d => rule.test(d))) matchCount++;
      }
    }
    if (matchCount > 0) {
      matched.push({ plugin, score: matchCount / rules.length, matchCount });
    }
  }
  return matched.sort((a, b) => b.score - a.score);
}

function getEnabledTools(context) {
  const matched = detectPlugins(context);
  const tools = new Set();
  for (const { plugin } of matched) {
    if (plugin.tools) { for (const t of plugin.tools) tools.add(t); }
  }
  return [...tools];
}

function getProjectRules(context) {
  const matched = detectPlugins(context);
  const rules = [];
  for (const { plugin } of matched) {
    if (plugin.rules) rules.push(...plugin.rules);
  }
  return rules;
}

function available() {
  return loadAll().map(p => ({ name: p.name, version: p.version || "1.0.0", description: p.description || "" }));
}

function getManifest(pluginName) {
  const plugins = loadAll();
  const plugin = plugins.find(p => p.name === pluginName);
  if (!plugin) return null;
  return {
    name: plugin.name,
    version: plugin.version || "1.0.0",
    description: plugin.description || "",
    capabilities: plugin.tools || [],
    validators: plugin.rules || [],
    detect: plugin.detect || [],
  };
}

function searchMarketplace(query) {
  ensureMarketplace();
  const entries = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf-8"));
  const q = query.toLowerCase();
  return entries.filter(e =>
    e.name.toLowerCase().includes(q) || (e.description || "").toLowerCase().includes(q) ||
    (e.capabilities || []).some(c => c.includes(q))
  );
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
  loaded = null;
  return { error: false, message: `Plugin '${pluginName}' installed successfully` };
}

function uninstall(pluginName) {
  let installed = getInstalled();
  const idx = installed.findIndex(i => i.name === pluginName);
  if (idx === -1) return { error: true, message: `Plugin '${pluginName}' is not installed` };
  installed.splice(idx, 1);
  saveInstalled(installed);
  loaded = null;
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
  loaded = null;
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
  const manifest = getManifest(pluginName);
  if (!manifest) return { compatible: false, reason: "Plugin not found" };
  const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf-8"));
  const entry = marketplace.find(e => e.name === pluginName);
  if (!entry) return { compatible: true, reason: "Local only" };
  const cmp = compareVersions(manifest.version, entry.version);
  if (cmp < 0) return { compatible: true, reason: `Update available: ${manifest.version} → ${entry.version}`, updateAvailable: true, latest: entry.version };
  return { compatible: true, reason: "Up to date" };
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

function getInstalled() {
  if (!fs.existsSync(INSTALLED_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(INSTALLED_FILE, "utf-8")); } catch { return []; }
}

function saveInstalled(list) {
  fs.writeFileSync(INSTALLED_FILE, JSON.stringify(list, null, 2));
}

function ensureMarketplace() {
  if (!fs.existsSync(MARKETPLACE_FILE)) {
    fs.writeFileSync(MARKETPLACE_FILE, JSON.stringify(DEFAULT_MARKETPLACE, null, 2));
  }
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

module.exports = { loadAll, detectPlugins, getEnabledTools, getProjectRules, available, getManifest, searchMarketplace, install, uninstall, remove, update, publish, checkCompatibility, getInstalled };
