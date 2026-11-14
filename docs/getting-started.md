# Getting Started with DevOS

This guide sets up DevOS from scratch.

---

## 1. Install prerequisites

- PowerShell 7 (Windows, required by the `.ps1` helper scripts)
- Git
- WezTerm (recommended terminal)
- Node.js 18+
- Nerd Font (JetBrains Mono recommended)

Optional: the OpenCode CLI for the `opencode` AI provider.

---

## 2. Clone the repository

```bash
git clone https://github.com/Marcu08/DevOS.git
cd DevOS
```

---

## 3. Install and verify

```bash
npm ci
node cli.js doctor
node cli.js setup     # optional: configure AI/GitHub/Supabase credentials
```

`doctor` verifies Git, Node.js, npm, and the workspace. A missing `workspace/` is
expected on a fresh clone; it is created by the first run.

---

## 4. Run your first task

### Single-agent pipeline

```bash
node cli.js run "analyze project"
```

### Multi-agent orchestration

```bash
node cli.js orchestrate "refactor project structure"
```

### Security scan

```bash
node cli.js security
```

### View explanations

```bash
node cli.js explain
```

---

## 5. Explore further

```bash
node cli.js help           # all commands
node cli.js history        # past runs
node cli.js memory         # memory and knowledge graph
node cli.js providers      # standalone AI providers
node cli.js dashboard      # web UI at localhost:3000
npm run bench              # startup and context timings
npm run test:coverage      # coverage report
```

---

## 6. Environment variables

For AI providers and integrations:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic provider |
| `OPENAI_API_KEY` | OpenAI provider |
| `DEEPSEEK_API_KEY` | DeepSeek provider |
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub API authentication |
| `DEVOS_ROOT` | Override the project root |
| `DEVOS_NO_CACHE` | Set to `1` to bypass the context cache |
| `DEVOS_OPENCODE_BIN` | Override the OpenCode binary |

Run `npm run setup` to write these values to a gitignored `.env`.
