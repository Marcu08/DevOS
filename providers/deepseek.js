const https = require("https");

const BASE = "api.deepseek.com";

function apiRequest(payload) {
  return new Promise((resolve) => {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) return resolve(null);
    const data = JSON.stringify(payload);
    const opts = {
      hostname: BASE, path: "/v1/chat/completions", method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Content-Length": Buffer.byteLength(data) },
    };
    const req = https.request(opts, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on("error", () => resolve(null));
    req.write(data);
    req.end();
  });
}

async function generate(prompt) {
  const data = await apiRequest({ model: "deepseek-chat", max_tokens: 4096, messages: [{ role: "user", content: prompt }] });
  if (!data?.choices?.[0]?.message?.content) return null;
  return { content: data.choices[0].message.content, usage: data.usage, model: "deepseek-chat" };
}

async function analyze(context, task) {
  const prompt = `Analyze this software engineering task. Task: "${task}". Context: ${(context.topFiles || []).slice(0, 5).map(f => f.file).join(", ")}. Output JSON with confidence, priority, complexity.`;
  const data = await apiRequest({ model: "deepseek-chat", max_tokens: 1024, messages: [{ role: "user", content: prompt }] });
  if (!data?.choices?.[0]?.message?.content) return { confidence: 0.5, priority: "medium" };
  try { return JSON.parse(data.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { return { confidence: 0.5, priority: "medium" }; }
}

async function review(code, context) {
  const prompt = `Review this code change as JSON: { issues: [{severity,description}], score: number, approved: boolean }. Code: ${JSON.stringify(code).slice(0, 4000)}.`;
  const data = await apiRequest({ model: "deepseek-chat", max_tokens: 1024, messages: [{ role: "user", content: prompt }] });
  if (!data?.choices?.[0]?.message?.content) return { issues: [], score: 0.5, approved: false };
  try { return JSON.parse(data.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { return { issues: [], score: 0.5, approved: false }; }
}

function isAvailable() { return !!process.env.DEEPSEEK_API_KEY; }

module.exports = { generate, analyze, review, isAvailable };
