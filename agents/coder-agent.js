const executor = require("../agent/executor");
const validator = require("../agent/validator");
const log = require("../agent/logger").get();

const agent = {
  name: "coder-agent",
  version: "1.0.0",

  analyze(context, task) {
    log.info("[CODER] Analyzing code generation requirements", "AGENT");
    const filesToModify = (context.topFiles || []).slice(0, 10);
    return {
      task,
      filesToModify: filesToModify.map(f => f.file),
      dependencies: context.dependencyMap || {},
      language: context.language || "unknown",
      complexity: filesToModify.reduce((s, f) => s + (f.functions || 0), 0),
    };
  },

  execute(context, analysis) {
    log.info("[CODER] Generating code patches", "AGENT");
    let patches = [];
    try {
      const pr = executor.generatePR(analysis.task, context);
      if (pr && pr.files) {
        patches = pr.files.map(f => ({
          file: f.path,
          status: f.status || "modified",
          content: f.content || "",
        }));
      }
    } catch (e) {
      log.warn(`[CODER] Generation error: ${e.message}`, "AGENT");
    }
    return {
      task: analysis.task,
      patches,
      patchCount: patches.length,
    };
  },

  review(result) {
    const issues = [];
    if (!result.patches || result.patches.length === 0) {
      issues.push("No patches generated");
    }
    for (const p of (result.patches || [])) {
      if (!p.file) issues.push("Patch missing file path");
    }
    return {
      agent: agent.name,
      approved: issues.length === 0,
      patchCount: result.patches?.length || 0,
      issues,
    };
  },
};

module.exports = agent;
