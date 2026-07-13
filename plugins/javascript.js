module.exports = {
  name: "javascript",
  version: "1.0.0",
  description: "JavaScript project detection and tooling",
  detect: [".js", "package.json", "node_modules"],
  tools: ["eslint", "npm"],
  rules: [
    "Run `npm install` before validation",
    "Use `node --check` for syntax validation",
    "Check for missing dependencies in package.json",
  ],
};
