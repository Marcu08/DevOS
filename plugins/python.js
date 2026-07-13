module.exports = {
  name: "python",
  version: "1.0.0",
  description: "Python project detection and tooling",
  detect: [".py", "requirements.txt", "setup.py", "pyproject.toml", "Pipfile"],
  tools: ["pytest", "flake8"],
  rules: [
    "Run `pip install -r requirements.txt` if present",
    "Use `python -m py_compile` for syntax validation",
    "Check for unused imports",
  ],
};
