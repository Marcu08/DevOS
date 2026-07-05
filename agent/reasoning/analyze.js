function run(task, context) {
  const topFiles = context.topFiles || [];
  const depMap = context.dependencyMap || {};
  const exportsMap = context.exportsMap || {};

  const affectedFiles = topFiles.slice(0, 8).map(f => {
    const deps = depMap[f.file] || [];
    const exported = exportsMap[f.file] || [];
    return {
      file: f.file,
      language: f.language,
      score: f.score,
      complexity: f.complexity || {},
      imports: deps,
      exports: exported,
    };
  });

  const highComplexity = affectedFiles.filter(f => (f.complexity.functions || 0) > 5);
  const fileCount = affectedFiles.length;

  let priority = "low";
  if (fileCount > 5 || highComplexity.length > 2) priority = "high";
  else if (fileCount > 2 || highComplexity.length > 0) priority = "medium";

  const reasoning = {
    task,
    totalFiles: context.totalFiles,
    likelyAffected: affectedFiles.length,
    highComplexityFiles: highComplexity.length,
    primaryModule: affectedFiles[0]?.file || null,
    dependentsCount: Object.keys(depMap).length,
  };

  return { problem: task, affectedFiles, priority, reasoning };
}

module.exports = { run };
