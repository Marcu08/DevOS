const fs = require("fs");
const path = require("path");
const DEVOS = require("./config");

const TRANSITIONS = {
  Idle: ["Planning"],
  Planning: ["Executing"],
  Executing: ["Validating", "Rollback"],
  Validating: ["Completed", "Failed"],
  Failed: ["Rollback"],
  Rollback: ["Executing", "Failed"],
  Completed: [],
};

const STEP_STATES = ["pending", "running", "completed", "failed", "rollback", "skipped"];

let agentState = {
  task: "",
  machine: "Idle",
  branch: null,
  lastError: null,
  execution: null,
};

function init(task) {
  agentState.task = task;
  agentState.machine = "Idle";
  agentState.branch = null;
  agentState.lastError = null;
  agentState.execution = {
    started: null,
    ended: null,
    steps: [],
  };
  persist();
}

function transition(to) {
  const current = agentState.machine;
  const allowed = TRANSITIONS[current] || [];

  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${current} → ${to} (allowed: ${allowed.join(", ") || "none"})`);
  }

  agentState.machine = to;
  persist();
}

function update(partial) {
  Object.assign(agentState, partial);
  persist();
}

function persist() {
  agentState.timestamp = new Date().toISOString();
  const dir = DEVOS.logs;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify(agentState, null, 2));
}

function get() {
  return { ...agentState, clone: () => JSON.parse(JSON.stringify(agentState)) };
}

function getMachine() {
  return agentState.machine;
}

function getTask() {
  return agentState.task;
}

function addStep(stepDef) {
  const steps = agentState.execution.steps;
  const id = steps.length + 1;
  const step = {
    id,
    action: stepDef.action,
    label: stepDef.label || stepDef.action,
    status: "pending",
    started: null,
    ended: null,
    error: null,
    retries: 0,
    retryPolicy: stepDef.retryPolicy || { maxRetries: 0, retryOn: [] },
  };
  steps.push(step);
  persist();
  return step;
}

function updateStep(id, partial) {
  const step = agentState.execution.steps.find(s => s.id === id);
  if (step) {
    Object.assign(step, partial);
    persist();
  }
}

function startExecution() {
  agentState.execution.started = new Date().toISOString();
  persist();
}

function endExecution(status) {
  agentState.execution.ended = new Date().toISOString();
  transition(status === "completed" ? "Completed" : "Failed");
  persist();
}

module.exports = {
  init, transition, update, get, getMachine, getTask,
  addStep, updateStep, startExecution, endExecution,
  STEP_STATES, TRANSITIONS,
};
