module.exports = {
  name: "graphql",
  version: "1.2.0",
  description: "GraphQL schema and resolver detection, linting, and validation rules",

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

  tools: ["npm", "eslint", "test"],

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