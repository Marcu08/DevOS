module.exports = {
  name: "react",
  version: "1.0.0",
  description: "React project detection and tooling",
  detect: ["react", "jsx", "tsx", "create-react-app", "next"],
  tools: ["eslint", "npm", "jest"],
  rules: [
    "Validate JSX syntax with eslint-plugin-react",
    "Run `npm test` to verify component behavior",
    "Check for unused React imports",
    "Ensure hooks follow rules of hooks",
  ],
};
