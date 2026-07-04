const fs = require("fs");
const path = require("path");
const DEVOS = require("./config");

const LOGS = DEVOS.logs;

let agentState = { task: "", status: "idle", branch: null, lastError: null };

function init(task) {
  agentState.task = task;
  agentState.status = "started";
  agentState.branch = null;
  agentState.lastError = null;
  write();
}

function update(partial) {
  Object.assign(agentState, partial);
  write();
}

function write() {
  agentState.timestamp = new Date().toISOString();
  fs.mkdirSync(LOGS, { recursive: true });
  fs.writeFileSync(path.join(LOGS, "state.json"), JSON.stringify(agentState, null, 2));
}

function get() {
  return { ...agentState };
}

module.exports = { init, update, write, get };
