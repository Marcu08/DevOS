// Help metadata for built-in commands. Handlers are loaded lazily so commands
// like `help`, `config`, or `mode` never pay for the pipeline, GitHub, or
// security modules they do not use.
module.exports = [
  { name: "config", file: "config.js", description: "Show the current DevOS configuration" },
  { name: "dashboard", file: "dashboard.js", description: "Start local web dashboard (localhost:3000)" },
  { name: "doctor", file: "doctor.js", description: "Run environment health checks" },
  { name: "explain", file: "explain.js", description: "Explain decisions with reasoning, confidence, and evidence" },
  { name: "history", file: "history.js", description: "Show execution history" },
  { name: "issue", file: "issue.js", description: "GitHub issue operations (analyze)" },
  { name: "memory", file: "memory.js", description: "Show memory, knowledge graph, and error statistics" },
  { name: "mode", file: "mode.js", description: "Set or view execution mode (autonomous, assisted, safe)" },
  { name: "orchestrate", file: "orchestrate.js", description: "Run multi-agent orchestration pipeline" },
  { name: "performance", file: "performance.js", description: "Show performance metrics (execution time, cache, agent duration)" },
  { name: "plugins", file: "plugins.js", description: "List, install, and manage plugins" },
  { name: "pr", file: "pr.js", description: "GitHub PR operations (review, create)" },
  { name: "rollback", file: "rollback.js", description: "Roll back the workspace to the last clean state" },
  { name: "run", file: "run.js", description: "Run the DevOS agent pipeline with a task" },
  { name: "sandbox", file: "sandbox.js", description: "Isolated sandbox execution environment" },
  { name: "security", file: "security.js", description: "Run security scan on the current project" },
  { name: "setup", file: "setup.js", description: "Configure AI, GitHub, and Supabase credentials" },
  { name: "validate", file: "validate.js", description: "Run all validators on the current workspace" },
];
