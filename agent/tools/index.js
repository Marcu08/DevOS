const eslint = require("./eslint");
const npm = require("./npm");
const tests = require("./tests");
const doctor = require("./doctor");

const REGISTRY = {
  eslint: { module: eslint, defaultArgs: ["."] },
  lint: { module: eslint, defaultArgs: ["."] },
  npm: { module: npm, defaultArgs: [] },
  install: { module: npm, method: "install" },
  test: { module: tests, defaultArgs: [] },
  tests: { module: tests, defaultArgs: [] },
  doctor: { module: doctor },
};

function run(name, args = []) {
  const tool = REGISTRY[name];
  if (!tool) return { ok: false, error: `Unknown tool: ${name}. Available: ${Object.keys(REGISTRY).join(", ")}` };

  if (tool.method) {
    return tool.module[tool.method](args);
  }

  return tool.module.run(args.length > 0 ? args : tool.defaultArgs || []);
}

function available() {
  return Object.keys(REGISTRY);
}

module.exports = { run, available };
