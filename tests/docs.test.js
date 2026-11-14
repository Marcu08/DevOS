module.exports = function test(assert) {
  const fs = require("fs");
  const path = require("path");

  const ROOT = path.join(__dirname, "..");
  const docsDir = path.join(ROOT, "docs");
  const files = [
    "README.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    ...fs.readdirSync(docsDir).filter((name) => name.endsWith(".md")).map((name) => path.join("docs", name)),
  ];

  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf-8");
    const links = [...content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)]
      .map((match) => match[1])
      .filter((link) => !link.startsWith("http") && !link.startsWith("mailto:"));

    for (const link of links) {
      const target = path.resolve(path.dirname(path.join(ROOT, file)), decodeURIComponent(link));
      assert.ok(fs.existsSync(target), `${file}: missing link target ${link}`);
    }
  }

  const commands = fs.readFileSync(path.join(docsDir, "Commands.md"), "utf-8");
  for (const command of ["mode", "sandbox", "performance", "providers", "setup"]) {
    assert.ok(commands.includes(`node cli.js ${command}`), `Commands.md should document ${command}`);
  }

  for (const file of ["docs/Commands.md", "docs/demo.md", "docs/getting-started.md", "docs/workflow.md"]) {
    const content = fs.readFileSync(path.join(ROOT, file), "utf-8");
    assert.ok(!content.includes("v1.4.0"), `${file} should not contain stale v1.4.0 labels`);
  }

  assert.ok(fs.existsSync(path.join(ROOT, "CONTRIBUTING.md")), "CONTRIBUTING.md should exist");
  assert.ok(fs.existsSync(path.join(ROOT, "SECURITY.md")), "SECURITY.md should exist");
};
