function run(plan, analysis) {
  const issues = [];
  const warnings = [];

  if (!plan.filesInvolved || plan.filesInvolved.length === 0) {
    issues.push("No files targeted for modification");
  }

  analysis.affectedFiles.forEach(f => {
    if (f.complexity?.functions > 15) {
      warnings.push(`${f.file} has high function count (${f.complexity.functions}) — changes may be risky`);
    }
    if ((f.complexity?.imports || 0) > 8) {
      warnings.push(`${f.file} has many imports (${f.complexity.imports}) — dependency impact may be high`);
    }
  });

  const stepTypes = new Set(plan.steps?.map(s => s.type) || []);
  if (!stepTypes.has("modify")) {
    issues.push("Plan has no modification steps");
  }
  if (!stepTypes.has("validate")) {
    warnings.push("Plan has no validation steps");
  }

  const hasHighRisk = plan.risk === "high" && analysis.affectedFiles.length > 5;
  if (hasHighRisk) {
    warnings.push(`High risk plan affecting ${analysis.affectedFiles.length} files — consider splitting into smaller tasks`);
  }

  const approved = issues.length === 0;

  return { issues, warnings, approved, feedback: issues.length > 0 ? issues[0] : (warnings.length > 0 ? warnings[0] : "Plan looks sound") };
}

module.exports = { run };
