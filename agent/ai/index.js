const DEVOS = require("../config");
const { buildPrompt } = require("./prompt");
const opencode = require("./opencode");
const direct = require("./direct");
const fallback = require("./fallback");

const PROVIDER_NAMES = ["opencode", "direct", "fallback"];

function generatePatch(task, context, errors) {
  const prompt = buildPrompt(task, context, errors);

  const result = tryProvider("opencode", () => opencode.run(prompt, task))
    || tryProvider("direct", () => direct.run(prompt))
    || fallback.run(task, context, errors);

  savePromptAndResult(prompt, result);
  return result;
}

function tryProvider(name, fn) {
  console.log(`[AI] Trying provider: ${name}`);
  try {
    const result = fn();
    if (result && result.files && result.files.length > 0) {
      console.log(`[AI] ${name} generated ${result.files.length} file(s)`);
      return result;
    }
    console.log(`[AI] ${name} returned no valid patches`);
  } catch (e) {
    console.log(`[AI] ${name} error: ${e.message}`);
  }
  return null;
}

function savePromptAndResult(prompt, result) {
  const fs = require("fs");
  const path = require("path");
  fs.mkdirSync(DEVOS.logs, { recursive: true });
  fs.writeFileSync(path.join(DEVOS.logs, "ai_prompt.txt"), prompt, "utf-8");
  fs.writeFileSync(path.join(DEVOS.logs, "ai_result.json"), JSON.stringify(result, null, 2));
}

function available() {
  return PROVIDER_NAMES;
}

module.exports = { generatePatch, available };
