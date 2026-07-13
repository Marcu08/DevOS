const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgYellow: "\x1b[43m",
  bgCyan: "\x1b[46m",
  gray: "\x1b[90m",
};

function icon(name) {
  const icons = { ok: "✓", fail: "✗", pending: "◐", arrow: "→", bullet: "●", info: "ℹ", warning: "⚠", star: "★" };
  return icons[name] || "•";
}

function colorize(text, color) {
  return `${C[color] || ""}${text}${C.reset}`;
}

function banner(title) {
  const line = "━".repeat(50);
  console.log(`\n${C.cyan}${line}${C.reset}`);
  console.log(` ${C.bold}${title}${C.reset}`);
  console.log(`${C.cyan}${line}${C.reset}\n`);
}

function status(label, state, detail) {
  const symbols = {
    ok: `${C.green}${icon("ok")}${C.reset}`,
    fail: `${C.red}${icon("fail")}${C.reset}`,
    running: `${C.yellow}${icon("pending")}${C.reset}`,
    skip: `${C.dim}${icon("arrow")}${C.reset}`,
  };
  const sym = symbols[state] || symbols.running;
  const detailStr = detail ? ` ${C.dim}${detail}${C.reset}` : "";
  console.log(`   ${sym} ${label}${detailStr}`);
}

function progressBar(current, total, label) {
  const width = 20;
  const ratio = total > 0 ? current / total : 0;
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const bar = `${C.green}${"█".repeat(filled)}${C.reset}${C.dim}${"░".repeat(empty)}${C.reset}`;
  const pct = `${Math.round(ratio * 100)}%`;
  const lbl = label ? ` ${label}` : "";
  process.stdout.write(`\r   ${bar} ${C.bold}${pct}${C.reset}${lbl}`);
  if (current === total) process.stdout.write("\n");
}

function stepLine(step, current, total) {
  const num = `${C.dim}${current}/${total}${C.reset}`;
  const icon = step.status === "completed" ? `${C.green}${icon("ok")}${C.reset}`
    : step.status === "failed" ? `${C.red}${icon("fail")}${C.reset}`
    : step.status === "running" ? `${C.yellow}${icon("pending")}${C.reset}`
    : `${C.dim}${icon("pending")}${C.reset}`;
  const name = step.action || step.label || "step";
  const detail = step.error ? ` ${C.red}${step.error.slice(0, 60)}${C.reset}` : "";
  return `   ${num} ${icon} ${C.bold}${name}${C.reset}${detail}`;
}

function table(rows) {
  if (rows.length === 0) return;
  const colWidths = rows[0].map((_, ci) => Math.max(...rows.map(r => (r[ci] || "").replace(/\x1b\[[\d;]+m/g, "").length)));
  for (const row of rows) {
    const line = row.map((cell, ci) => cell + " ".repeat(colWidths[ci] - cell.replace(/\x1b\[[\d;]+m/g, "").length)).join("   ");
    console.log(`   ${line}`);
  }
}

function divider() {
  console.log(`   ${C.dim}${"─".repeat(46)}${C.reset}`);
}

function success(msg) {
  console.log(` ${C.green}${icon("ok")}${C.reset} ${C.bold}${msg}${C.reset}`);
}

function error(msg) {
  console.log(` ${C.red}${icon("fail")}${C.reset} ${C.bold}${msg}${C.reset}`);
}

function info(msg) {
  console.log(`   ${C.cyan}${icon("info")}${C.reset} ${msg}`);
}

function warn(msg) {
  console.log(`   ${C.yellow}${icon("warning")}${C.reset} ${msg}`);
}

module.exports = { C, icon, colorize, banner, status, progressBar, stepLine, table, divider, success, error, info, warn };
