module.exports = async function test(assert) {
  const providers = require("../providers/index");

  // Module structure
  assert.ok(typeof providers.generate === "function", "providers should have generate");
  assert.ok(typeof providers.analyze === "function", "providers should have analyze");
  assert.ok(typeof providers.review === "function", "providers should have review");
  assert.ok(typeof providers.available === "function", "providers should have available");

  // Local provider (always available)
  const local = require("../providers/local");
  assert.ok(typeof local.generate === "function", "local provider should have generate");
  assert.ok(typeof local.analyze === "function", "local provider should have analyze");
  assert.ok(typeof local.review === "function", "local provider should have review");
  assert.ok(local.isAvailable() === true, "local provider should always be available");

  // Anthropic provider
  const anthropic = require("../providers/anthropic");
  assert.ok(typeof anthropic.generate === "function", "anthropic should have generate");
  assert.ok(typeof anthropic.analyze === "function", "anthropic should have analyze");
  assert.ok(typeof anthropic.review === "function", "anthropic should have review");
  assert.ok(typeof anthropic.isAvailable === "function", "anthropic should have isAvailable");

  // OpenAI provider
  const openai = require("../providers/openai");
  assert.ok(typeof openai.generate === "function", "openai should have generate");
  assert.ok(typeof openai.analyze === "function", "openai should have analyze");
  assert.ok(typeof openai.review === "function", "openai should have review");
  assert.ok(typeof openai.isAvailable === "function", "openai should have isAvailable");

  // DeepSeek provider
  const deepseek = require("../providers/deepseek");
  assert.ok(typeof deepseek.generate === "function", "deepseek should have generate");
  assert.ok(typeof deepseek.analyze === "function", "deepseek should have analyze");
  assert.ok(typeof deepseek.review === "function", "deepseek should have review");
  assert.ok(typeof deepseek.isAvailable === "function", "deepseek should have isAvailable");

  // Local provider generate
  const genResult = await local.generate("test prompt");
  assert.ok(genResult !== null, "local generate should return result");
  assert.ok(typeof genResult.content === "string", "local generate should have content");
  assert.ok(genResult.model === "local-fallback", "local generate should identify model");

  // Local provider analyze
  const ctx = { topFiles: [{ file: "test.js" }, { file: "app.js" }] };
  const analysis = await local.analyze(ctx, "test task");
  assert.ok(analysis.confidence === 0.3, "local analyze should have low confidence");
  assert.ok(analysis.priority, "local analyze should have priority");
  assert.ok(analysis.complexity, "local analyze should have complexity");

  // Local provider review
  const review = await local.review({ patches: [] }, ctx);
  assert.ok(review.score === 0.5, "local review should have default score");
  assert.ok(review.approved === true, "local review should approve");
  assert.ok(Array.isArray(review.issues), "local review should have issues array");

  // Provider manager available
  const available = providers.available();
  assert.ok(Array.isArray(available), "available should return array");
  assert.ok(available.length >= 4, "should have at least 4 providers");
  assert.ok(available.some(p => p.name === "local"), "should include local");
  assert.ok(available.some(p => p.name === "openai"), "should include openai");
  assert.ok(available.some(p => p.name === "anthropic"), "should include anthropic");
  assert.ok(available.some(p => p.name === "deepseek"), "should include deepseek");

  // Provider manager generate with local
  const mgrResult = await providers.generate("test prompt", "local");
  assert.ok(mgrResult !== null, "provider manager generate should work");
  assert.ok(mgrResult.provider === "local", "should return provider name");

  // Provider manager analyze
  const mgrAnalysis = await providers.analyze(ctx, "test task");
  assert.ok(mgrAnalysis.provider, "analyze should return provider name");
};
