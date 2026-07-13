const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".json": "application/json" };

function loadJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch { return null; }
}

function apiData() {
  const logsDir = path.join(__dirname, "..", "logs");
  const state = loadJSON(path.join(logsDir, "state.json"));
  return {
    state,
    context: loadJSON(path.join(logsDir, "context.json")),
    analysis: loadJSON(path.join(logsDir, "analysis.json")),
    plan: loadJSON(path.join(logsDir, "reasoning-plan.json")),
    confidence: loadJSON(path.join(logsDir, "confidence.json")),
    review: loadJSON(path.join(logsDir, "review.json")),
    execution: loadJSON(path.join(logsDir, "execution.json")),
    report: loadJSON(path.join(logsDir, "report.json")),
    history: loadJSON(path.join(logsDir, "memory-history.json")),
    mistakes: loadJSON(path.join(logsDir, "memory-mistakes.json")),
    knowledge: loadJSON(path.join(logsDir, "memory-knowledge.json")),
    explain: loadJSON(path.join(logsDir, "explain.json")),
    performance: loadJSON(path.join(logsDir, "performance-metrics.json")),
    sandbox: loadJSON(path.join(path.join(__dirname, "..", "workspace", "sandbox"), "status.json")),
    cache: loadJSON(path.join(logsDir, "cache", "metrics.json")),
    agents: state?.agents || null,
  };
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer((req, res) => {
  if (req.url === "/api") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(apiData()));
    return;
  }
  if (req.url === "/" || req.url === "/index.html") {
    serveFile(res, path.join(__dirname, "index.html"));
    return;
  }
  const filePath = path.join(__dirname, req.url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

console.log(`\n  DevOS Dashboard v1.5.0 running at http://localhost:${PORT}\n`);
server.listen(PORT);
