const { execFileSync } = require("child_process");

const REQUEST_HELPER = require("path").join(__dirname, "request-helper.js");

function apiRequest(endpoint, body) {
  try {
    const out = execFileSync("node", [REQUEST_HELPER], {
      encoding: "utf-8",
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
      env: {
        ...process.env,
        DEVOS_AI_HOST: endpoint.hostname,
        DEVOS_AI_PATH: endpoint.path,
        DEVOS_AI_AUTH: endpoint.authHeader,
        DEVOS_AI_VER: endpoint.versionHeader || "",
        DEVOS_AI_KEY: endpoint.apiKey,
        DEVOS_AI_BODY: body,
      },
    });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const body = JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const data = apiRequest({
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      apiKey,
      authHeader: "x-api-key",
      versionHeader: "anthropic-version:2023-06-01",
    }, body);
    if (!data) return null;
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
    const data = apiRequest({
      hostname: "api.openai.com",
      path: "/v1/chat/completions",
      apiKey,
      authHeader: "Authorization",
      versionHeader: "",
    }, body);
    if (!data) return null;
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
