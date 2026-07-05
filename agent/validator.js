function validatePlan(plan) {
  const errors = [];

  if (!plan) return { valid: false, errors: ["Plan is null"] };
  if (!plan.task) errors.push("Missing plan.task");
  if (!Array.isArray(plan.steps)) errors.push("Missing plan.steps");
  if (!plan.filesInvolved?.length) errors.push("Missing plan.filesInvolved");

  return { valid: errors.length === 0, errors };
}

function validatePR(pr) {
  const errors = [];

  if (!pr) return { valid: false, errors: ["PR is null"] };
  if (!pr.title) errors.push("Missing PR title");
  if (!Array.isArray(pr.files) || pr.files.length === 0) errors.push("PR must have at least one file");

  if (pr.files) {
    for (const f of pr.files) {
      if (!f.path) errors.push(`File missing path`);
      if (!f.patch) errors.push(`File ${f.path || "?"} missing patch`);
      if (!f.reason) errors.push(`File ${f.path || "?"} missing reason`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateContext(ctx) {
  const errors = [];

  if (!ctx) return { valid: false, errors: ["Context is null"] };
  if (!ctx.totalFiles) errors.push("Missing context.totalFiles");
  if (!Array.isArray(ctx.topFiles)) errors.push("Missing context.topFiles");

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePlan, validatePR, validateContext };
