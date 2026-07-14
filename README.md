# DevOS v2.0.0

**Autonomous AI software engineering orchestration framework.**

Analyzes → Plans → Modifies → Validates → Remembers → Explains.

Every decision is explainable, every modification is traceable, every error is reversible.

---

## What is DevOS?

DevOS is an operating system layer for autonomous software agents. Unlike AI coding assistants that simply generate code, DevOS orchestrates a complete engineering workflow:

1. **Context Analysis** — scans repositories, ranks files, builds dependency graphs
2. **Reasoning** — analyzes tasks, plans steps, scores confidence, self-reviews
3. **Multi-Agent Orchestration** — coordinates planner, coder, reviewer, and security agents
4. **Execution** — generates unified diffs, applies patches with context matching
5. **Validation** — syntax checks, git status, lint, and run validation
6. **Healing Loop** — PASS → keep, RETRY → heal and retry, ROLLBACK → revert
7. **Memory** — persistent history, mistake tracking, pattern learning, solution caching
8. **Explainability** — every decision recorded with reasoning, confidence, and evidence
9. **Security Scanning** — secrets detection, unsafe patterns, dependency analysis

---

## Quick Start

```bash
node cli.js doctor                     # health checks
node cli.js run "your task"            # run the pipeline
node cli.js orchestrate "task"         # multi-agent orchestration
node cli.js explain                    # decision explanations
node cli.js security                   # security scan
node cli.js help                       # all commands
```

## Commands

| Command | Description |
|---------|-------------|
| `run` | Run the DevOS agent pipeline with a task |
| `orchestrate` | Run multi-agent orchestration pipeline |
| `doctor` | Run environment health checks |
| `validate` | Run all validators on the current workspace |
| `rollback` | Roll back the workspace to the last clean state |
| `security` | Run security scan on the current project |
| `history` | Show execution history |
| `memory` | Show memory and error statistics |
| `explain` | Explain decisions with reasoning, confidence, and evidence |
| `plugins` | List, install, search, and manage plugins |
| `issue` | GitHub issue operations (analyze) |
| `pr` | GitHub PR operations (review, create) |
| `dashboard` | Start local web dashboard (localhost:3000) |
| `config` | Show the current DevOS configuration |
| `help` | Show this help message |

---

## Multi-Agent Architecture

DevOS v1.4.0 introduces a coordinated multi-agent system:

```
Task
  │
  ▼
┌──────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR                                                │
│  assigns tasks, passes context, collects results, decides    │
└──┬──────────┬────────────┬────────────────┬──────────────────┘
   │          │            │                │
   ▼          ▼            ▼                ▼
┌──────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
│PLANNER│ │ CODER  │ │ REVIEWER │ │   SECURITY   │
│Agent  │ │ Agent  │ │ Agent    │ │   Agent      │
└──┬────┘ └───┬────┘ └────┬─────┘ └──────┬───────┘
   │          │            │              │
   └──────────┴────────────┴──────────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  DECISION ENGINE  │
              │ COMMIT / RETRY /  │
              │ ROLLBACK          │
              └───────────────────┘
```

### Agents

| Agent | File | Responsibility |
|-------|------|----------------|
| Planner | `agents/planner-agent.js` | Task analysis, risk assessment, priority, step planning |
| Coder | `agents/coder-agent.js` | Code generation, patch creation |
| Reviewer | `agents/reviewer-agent.js` | Code review, quality scoring, issue detection |
| Security | `agents/security-agent.js` | Security scanning, vulnerability detection |
| Orchestrator | `agents/orchestrator.js` | Coordination, context passing, decision engine |

---

## GitHub Integration

Native GitHub workflow support via the GitHub API (no external CLI required):

```bash
node cli.js issue analyze <number>    # analyze an issue
node cli.js pr review <number>        # review a pull request
node cli.js pr create <title>         # create a pull request
```

Authentication via `GITHUB_TOKEN` or `GH_TOKEN` environment variable.

---

## Explainability Engine

Every important decision is recorded with full traceability:

- **Why** — reasoning behind each decision
- **Confidence** — numerical confidence score (0-100%)
- **Evidence** — supporting data (review scores, security findings)
- **Files Changed** — which files were modified
- **Similar Solutions** — previously recorded solutions for similar tasks

```bash
node cli.js explain                    # latest decision
node cli.js explain "task name"        # search by task
node cli.js explain --all              # all recent explanations
```

---

## Security Agent

Autonomous security reviewer with 5 scanning modules:

| Module | File | Capabilities |
|--------|------|--------------|
| Secrets | `agent/security/secrets.js` | API keys, passwords, tokens, private keys |
| Patterns | `agent/security/patterns.js` | eval, innerHTML, code injection, path traversal |
| Dependencies | `agent/security/dependencies.js` | Unsafe packages, loose versions, malicious scripts |
| Permissions | `agent/security/permissions.js` | Sensitive files, .gitignore compliance |
| Vulnerabilities | `agent/security/vulnerabilities.js` | Common mistakes, debug logging, empty catches |

Security results influence pipeline decisions: **PASS** / **RETRY** / **ROLLBACK**.

---

## AI Provider Abstraction

Unified provider interface for multiple AI backends:

| Provider | Auth Env Var | File |
|----------|-------------|------|
| OpenAI | `OPENAI_API_KEY` | `providers/openai.js` |
| Anthropic | `ANTHROPIC_API_KEY` | `providers/anthropic.js` |
| DeepSeek | `DEEPSEEK_API_KEY` | `providers/deepseek.js` |
| Local | always available | `providers/local.js` |

Each provider implements: `generate()`, `analyze()`, `review()`.

```javascript
const providers = require("./providers/index");
const result = await providers.generate("prompt", "preferred-provider");
```

---

## Plugin Marketplace

The plugin system now supports installable plugins with marketplace search:

```bash
node cli.js plugins                         # list installed
node cli.js plugins search <query>          # search marketplace
node cli.js plugins install <name>          # install a plugin
node cli.js plugins uninstall <name>        # uninstall
node cli.js plugins info <name>             # show plugin manifest
```

Built-in plugins: `javascript`, `python`, `react`, `docker`, and 6 more in the marketplace.

---

## Architecture

```
User Task
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  CONTEXT ENGINE                                     │
│  scan → rank → dependency map → plugin detection    │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  MULTI-AGENT ORCHESTRATOR                           │
│  planner → coder → reviewer → security → decision   │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  EXECUTOR                                           │
│  validate PR → generate diffs → apply patches       │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  VALIDATOR ENGINE                                   │
│  syntax → node run → git status → lint              │
└──────────────────────┬──────────────────────────────┘
                       ▼
      ┌─────────────────────────────────────┐
      │  DECISION ENGINE                    │
      │  PASS → keep changes                │
      │  RETRY → heal and retry             │
      │  ROLLBACK → revert workspace        │
      └─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  MEMORY ENGINE                                      │
│  history → mistakes → patterns → solutions          │
│  search → similarity → recommendations              │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  EXPLAINABILITY ENGINE                              │
│  reasoning → confidence → evidence → summary        │
└─────────────────────────────────────────────────────┘
```

## Engines

| Engine | Location | Description |
|--------|----------|-------------|
| Context | `agent/context.js` | Scan repo, rank files, build dependency graph |
| Reasoning | `agent/reasoning/` | Analyze, plan, confidence scoring, self-review |
| Orchestrator | `agents/orchestrator.js` | Multi-agent coordination and decision engine |
| Agents | `agents/` | Planner, coder, reviewer, security agents |
| Executor | `agent/executor/` | PR validation, patch application, git commits |
| Patch Engine | `agent/patch-engine/` | Unified diff with context matching (skips stale hunks) |
| Validator | `agent/validator/` | Syntax, node, git, lint checks |
| Decision | `agent/pipeline/healing.js` | PASS / RETRY / ROLLBACK with healing loop |
| State Machine | `agent/state.js` | Idle → Planning → Executing → Validating → Completed |
| Memory | `agent/memory/` | History, mistakes, patterns, solutions, similarity |
| Security | `agent/security/` | Secrets, patterns, dependencies, permissions, vulnerabilities |
| Explain | `agent/explain/` | Decision recording, reasoning, confidence, evidence |
| Plugins | `plugins/` | JavaScript, React, Python, Docker auto-detection + marketplace |
| Providers | `providers/` | OpenAI, Anthropic, DeepSeek, local AI abstraction |
| GitHub | `agent/github/` | Issue analysis, PR review, PR creation |
| Tools | `agent/tools/` | ESLint, npm, tests, doctor runners |
| AI | `agent/ai/` | AI provider chain (opencode, direct, fallback) |
| CLI | `agent/cli/` | Professional command-line interface (14 commands) |
| Dashboard | `dashboard/` | Local web UI at localhost:3000 |

---

## Project Structure

```
DevOS/
├── agents/               Multi-agent system (planner, coder, reviewer, security, orchestrator)
├── agent/
│   ├── cli/              Professional CLI (output, commands, router)
│   ├── executor/         Plugin actions (applyPatch, validate, commit)
│   ├── explain/          Explainability engine (decision recording, reasoning)
│   ├── github/           GitHub integration (issues, PRs, API)
│   ├── memory/           History, mistakes, patterns, solutions, search, similarity
│   ├── patch-engine/     Unified diff parser, applier (context-matched), generator
│   ├── pipeline/         Orchestration (context → reasoning → exec → validate → heal)
│   ├── reasoning/        Analyze, plan, confidence (config-driven), reviewer
│   ├── security/         Security scanner (secrets, patterns, dependencies, permissions)
│   ├── validator/        Syntax, node, git, lint + report builder
│   ├── ai/               AI providers (opencode, direct, fallback)
│   └── tools/            ESLint, npm, tests, doctor runners
├── providers/            AI provider abstraction (openai, anthropic, deepseek, local)
├── cli.js                Thin CLI entry point (9 lines)
├── plugins/              Extensible plugin system + marketplace (javascript, react, python, docker)
├── dashboard/            Local web dashboard (server.js, index.html)
├── tests/                Automated test suites (286 tests, 13 suites)
├── examples/             Demo project and scripts
├── docs/                 Documentation
├── config/               Environment configuration
├── logs/                 JSON logs (context, plan, execution, report, memory)
└── workspace/            Git-managed working copy
```

---

## Plugin Development

Create a plugin with a consistent manifest:

```javascript
// plugins/my-plugin.js
module.exports = {
  name: "my-plugin",
  version: "1.0.0",
  description: "Description",
  detect: [".ext", "config-file", "keyword"],
  tools: ["tool1", "tool2"],
  rules: ["Rule 1", "Rule 2"],
};
```

```bash
node cli.js plugins info my-plugin   # view manifest
node cli.js plugins install my-plugin
```

---

## Configuration

All settings in `config/devos.json`:

- `validator` — enable/disable syntax, git, lint, node checks
- `tools` — enable npm, eslint, test runners
- `memory` — history/persistence limits
- `reasoning.confidenceThreshold` — minimum confidence to proceed (default: 0.6)
- `reasoning.maxHealingRetries` — max retry attempts (default: 3)
- `logging` — which JSON logs to produce

---

## Logs

| File | Description |
|------|-------------|
| `logs/context.json` | File list, ranking, dependency map |
| `logs/analysis.json` | Reasoning analysis |
| `logs/reasoning-plan.json` | Structured plan |
| `logs/confidence.json` | Confidence score |
| `logs/review.json` | Self-review report |
| `logs/execution.json` | Step trace |
| `logs/report.json` | Validator results |
| `logs/state.json` | State machine |
| `logs/explain.json` | Decision explanations |
| `logs/memory-*.json` | History, mistakes, patterns, solutions |
| `logs/ai_prompt.txt` | Last AI prompt |

---

## Testing

```bash
node tests/runner.js
```

13 test suites, 286 tests covering:
- Patch engine (parser, apply, generate, round-trip)
- State machine (transitions, steps, updates)
- Memory (history, mistakes, patterns, solutions, search, similarity, recommendations)
- Plugins (loading, detection, tools, rules)
- CLI (output, router, command registry)
- Similarity (tokenize, scoring)
- Config (structure, values)
- Agents (planner, coder, reviewer, security, orchestrator)
- Security (secrets, patterns, dependencies, permissions, vulnerabilities)
- GitHub (issues, PRs, API)
- Explainability (recording, decision building, CLI format)
- Providers (openai, anthropic, deepseek, local interface)
- Marketplace (search, install, uninstall, manifest)

---

## Security

- **v1.2.4+:** API keys passed via environment variables to isolated Node child processes. Never in command-line arguments.
- Patch engine validates context lines before applying to prevent file corruption from stale diffs.
- No shell injection vectors in `direct.js` (uses `execFileSync` with env vars).
- **v1.4.0:** Autonomous security scanner detects secrets, unsafe patterns, dependency risks, and permission issues.

---

## Requirements

- Node.js 18+
- Git
- PowerShell 7 (recommended)

---

## Philosophy

Reduce friction. Automate setup. Keep environments reproducible. Build AI-ready foundations.

> "Designed and developed an autonomous AI software engineering orchestration framework with reasoning, execution, validation, rollback, memory, multi-agent orchestration, security scanning, and explainability capabilities."
