const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const DEVOS = require("../config");

function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const { execSync } = require("child_process");
    const out = execSync(
      `curl -s https://api.anthropic.com/v1/messages -H "x-api-key: ${apiKey}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024, timeout: 120000 }
    );

    const data = JSON.parse(out);
    const text = data?.content?.[0]?.text || "";
    return parseOutput(text);
  } catch {
    return null;
  }
}

function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const body = JSON.stringify({
    model: "gpt-4o",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const out = execSync(
      `curl -s https://api.openai.com/v1/chat/completions -H "Authorization: Bearer ${apiKey}" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
      { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024, timeout: 120000 }
    );

    const data = JSON.parse(out);
    const text = data?.choices?.[0]?.message?.content || "";
    return parseOutput(text);
  } catch {
    return null;
  }
}

function parseOutput(text) {
  const jsonMatch = (text || "").match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function run(prompt) {
  return callAnthropic(prompt) || callOpenAI(prompt);
}

module.exports = { run };
