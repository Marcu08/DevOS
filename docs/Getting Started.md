# Getting Started with DevOS

This guide explains how to set up DevOS from scratch.

---

## 1. Install prerequisites

Install the following tools:

- PowerShell 7
- Git
- WezTerm (recommended terminal)
- Node.js 18+
- Nerd Font (JetBrains Mono)

---

## 2. Clone repository

```bash
git clone https://github.com/<your-username>/DevOS.git
cd DevOS
```

---

## 3. Verify setup

```bash
node cli.js doctor
```

---

## 4. Run your first task

### Quick run
```bash
node cli.js run "analyze project"
```

### Multi-agent orchestration (v1.4.0)
```bash
node cli.js orchestrate "refactor project structure"
```

### Security scan (v1.4.0)
```bash
node cli.js security
```

### View explanations (v1.4.0)
```bash
node cli.js explain
```

---

## 5. Explore further

```bash
node cli.js help           # all commands
node cli.js history        # past runs
node cli.js memory         # memory and errors
node cli.js dashboard      # web UI at localhost:3000
```

---

## 6. Environment variables (optional)

For AI providers:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI provider |
| `ANTHROPIC_API_KEY` | Anthropic provider |
| `DEEPSEEK_API_KEY` | DeepSeek provider |
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub API auth |
