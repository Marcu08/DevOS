function run(analysis) {
  const files = analysis.affectedFiles || [];
  const primary = files[0];

  const steps = [];

  steps.push({
    id: 1,
    type: "analyze",
    description: `Understand ${primary?.file || "project structure"} and its dependencies`,
    targets: [primary?.file].filter(Boolean),
  });

  for (const f of files.slice(0, 3)) {
    if (f.exports && f.exports.length > 0) {
      steps.push({
        id: steps.length + 1,
        type: "trace",
        description: `Map impact of ${f.file} exports: ${f.exports.join(", ")}`,
        targets: [f.file],
      });
    }
  }

  for (const f of files.slice(0, 4)) {
    steps.push({
      id: steps.length + 1,
      type: "modify",
      description: `Apply changes to ${f.file}`,
      targets: [f.file],
    });
  }

  steps.push({
    id: steps.length + 1,
    type: "validate",
    description: "Run syntax and project validation",
    command: "node index.js",
    targets: files.map(f => f.file),
  });

  steps.push({
    id: steps.length + 1,
    type: "finalize",
    description: "Prepare and review PR",
    targets: files.map(f => f.file),
  });

  const totalFunctions = files.reduce((s, f) => s + (f.complexity?.functions || 0), 0);
  const totalFiles = files.length;

  let risk = "low";
  if (totalFiles > 5 || totalFunctions > 20) risk = "high";
  else if (totalFiles > 2 || totalFunctions > 8) risk = "medium";

  return {
    task: analysis.problem,
    steps,
    risk,
    strategy: totalFiles > 3 ? "parallel" : "sequential",
    filesInvolved: files.map(f => f.file),
    estimatedComplexity: {
      files: totalFiles,
      functions: totalFunctions,
      imports: files.reduce((s, f) => s + (f.imports?.length || 0), 0),
    },
  };
}

module.exports = { run };
