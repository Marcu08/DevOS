const fs = require("fs");
const path = require("path");

const PLUGINS_DIR = __dirname;

let loaded = null;

function loadAll() {
  if (loaded) return loaded;
  loaded = [];
  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".js") && f !== "index.js");
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
    if (plugin.tools) {
      for (const t of plugin.tools) tools.add(t);
    }
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
  return loadAll().map(p => ({ name: p.name, version: p.version || "1.0.0" }));
}

module.exports = { loadAll, detectPlugins, getEnabledTools, getProjectRules, available };
