const pm = require("./manager");

const {
  getInstance, searchMarketplace, install, uninstall,
  remove, update, publish, checkCompatibility, getInstalled,
} = pm;

function loadAll() {
  return getInstance().getAll();
}

function detectPlugins(context) {
  return getInstance().detectPlugins(context);
}

function getEnabledTools(context) {
  return getInstance().getEnabledTools(context);
}

function getProjectRules(context) {
  return getInstance().getProjectRules(context);
}

function available() {
  return getInstance().available();
}

function getManifest(pluginName) {
  return getInstance().getManifest(pluginName);
}

module.exports = {
  loadAll,
  detectPlugins,
  getEnabledTools,
  getProjectRules,
  available,
  getManifest,
  searchMarketplace,
  install,
  uninstall,
  remove,
  update,
  publish,
  checkCompatibility,
  getInstalled,
};