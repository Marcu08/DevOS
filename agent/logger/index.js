const fs = require("fs");
const path = require("path");

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const COLORS = { DEBUG: "\x1b[90m", INFO: "\x1b[36m", WARN: "\x1b[33m", ERROR: "\x1b[31m", RESET: "\x1b[0m" };

let instance = null;

class Logger {
  constructor(config) {
    this.level = LEVELS[config?.level || "INFO"] ?? LEVELS.INFO;
    this.logDir = config?.directory || "logs";
    this.prefix = config?.prefix || "DEVOS";
    this._fileStream = null;
  }

  _timestamp() {
    return new Date().toISOString();
  }

  _logFile(level, message) {
    const date = new Date().toISOString().slice(0, 10);
    const logPath = path.join(this.logDir, `devos-${date}.log`);
    try {
      fs.mkdirSync(this.logDir, { recursive: true });
      fs.appendFileSync(logPath, `[${this._timestamp()}] [${level}] ${message}\n`);
    } catch {}
  }

  _log(level, msg, tag) {
    if (LEVELS[level] < this.level) return;
    const label = tag ? `[${tag}]` : "";
    const timestamp = this._timestamp().slice(11, 23);
    const color = COLORS[level] || "";
    const reset = COLORS.RESET;
    const text = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
    const consoleMsg = `${color}${timestamp}${reset} ${label}${text}`;
    const fileMsg = `${timestamp} ${label} ${text}`;
    console.log(consoleMsg);
    this._logFile(level, fileMsg);
  }

  debug(msg, tag) { this._log("DEBUG", msg, tag); }
  info(msg, tag) { this._log("INFO", msg, tag); }
  warn(msg, tag) { this._log("WARN", msg, tag); }
  error(msg, tag) { this._log("ERROR", msg, tag); }
}

function get(config) {
  if (!instance) {
    const DEVOS = require("../config");
    instance = new Logger(config || DEVOS.config?.logging || {});
  }
  return instance;
}

function reset() { instance = null; }

module.exports = { Logger, get, reset };
