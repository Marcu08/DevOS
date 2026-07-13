const fs = require("fs");
const path = require("path");
const log = require("../agent/logger").get();

const PROVIDERS_DIR = __dirname;
let providers = null;

function loadProviders() {
  if (providers) return providers;
  providers = {};
  const files = fs.readdirSync(PROVIDERS_DIR).filter(f => f.endsWith(".js") && f !== "index.js");
  for (const file of files) {
    const name = file.replace(".js", "");
    try {
      const mod = require(path.join(PROVIDERS_DIR, file));
      if (mod.generate && mod.analyze && mod.review) {
        providers[name] = mod;
        log.info(`Loaded provider: ${name}`, "PROVIDER");
      }
    } catch (e) {
      log.warn(`Failed to load provider ${name}: ${e.message}`, "PROVIDER");
    }
  }
  return providers;
}

function available() {
  loadProviders();
  return Object.keys(providers).map(k => ({
    name: k,
    available: providers[k].isAvailable ? providers[k].isAvailable() : false,
  }));
}

async function generate(prompt, preferred) {
  loadProviders();
  const order = preferred ? [preferred, ...Object.keys(providers).filter(p => p !== preferred)] : Object.keys(providers);
  for (const name of order) {
    const provider = providers[name];
    if (!provider) continue;
    if (provider.isAvailable && !provider.isAvailable()) continue;
    log.info(`[PROVIDER] Trying ${name} for generate`, "PROVIDER");
    try {
      const result = await provider.generate(prompt);
      if (result && result.content) {
        log.info(`[PROVIDER] ${name} generated response`, "PROVIDER");
        return { ...result, provider: name };
      }
    } catch (e) {
      log.warn(`[PROVIDER] ${name} error: ${e.message}`, "PROVIDER");
    }
  }
  log.warn("[PROVIDER] All providers failed for generate", "PROVIDER");
  return null;
}

async function analyze(context, task, preferred) {
  loadProviders();
  const order = preferred ? [preferred, ...Object.keys(providers).filter(p => p !== preferred)] : Object.keys(providers);
  for (const name of order) {
    const provider = providers[name];
    if (!provider) continue;
    if (provider.isAvailable && !provider.isAvailable()) continue;
    try {
      const result = await provider.analyze(context, task);
      if (result) return { ...result, provider: name };
    } catch (e) {
      log.warn(`[PROVIDER] ${name} analyze error: ${e.message}`, "PROVIDER");
    }
  }
  return { confidence: 0.3, priority: "medium", complexity: "medium", provider: "none" };
}

async function review(code, context, preferred) {
  loadProviders();
  const order = preferred ? [preferred, ...Object.keys(providers).filter(p => p !== preferred)] : Object.keys(providers);
  for (const name of order) {
    const provider = providers[name];
    if (!provider) continue;
    if (provider.isAvailable && !provider.isAvailable()) continue;
    try {
      const result = await provider.review(code, context);
      if (result) return { ...result, provider: name };
    } catch (e) {
      log.warn(`[PROVIDER] ${name} review error: ${e.message}`, "PROVIDER");
    }
  }
  return { issues: [], score: 0.5, approved: false, provider: "none" };
}

module.exports = { generate, analyze, review, available, loadProviders };
