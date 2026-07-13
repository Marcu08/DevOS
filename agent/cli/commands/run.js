const out = require("../output");
const state = require("../../state");

function handler(args) {
  const task = args.join(" ") || "analyze project";
  out.banner(`Task: ${task}`);

  const pipeline = require("../../pipeline/index");

  const stages = [
    { name: "Context analysis", state: "running" },
    { name: "Planning", state: "pending" },
    { name: "Executing", state: "pending" },
    { name: "Validating", state: "pending" },
    { name: "Completed", state: "pending" },
  ];

  for (const s of stages) out.status(s.name, s.state);
  console.log("");

  const result = pipeline.run(task);

  console.log("");
  if (result) {
    const s = state.get();
    stages[0].state = "ok";
    stages[1].state = "ok";
    stages[2].state = "ok";
    stages[3].state = "ok";
    stages[4].state = "ok";
    for (const st of stages) out.status(st.name, st.state);
    out.divider();
    out.success(`Task completed successfully`);
    if (s.execution?.steps?.length > 0) {
      console.log("");
      out.info(`${s.execution.steps.length} execution steps`);
      if (s.reasoning?.confidence) out.info(`Confidence: ${Math.round(s.reasoning.confidence * 100)}%`);
    }
  } else {
    stages[0].state = "ok";
    stages[1].state = "ok";
    stages[2].state = "fail";
    stages[3].state = "skip";
    stages[4].state = "fail";
    for (const st of stages) out.status(st.name, st.state);
    out.divider();
    out.error(`Task failed`);
    const st = state.get();
    if (st.lastError) out.warn(`  ${st.lastError}`);
  }
  console.log("");
}

module.exports = { handler, description: "Run the DevOS agent pipeline with a task" };
