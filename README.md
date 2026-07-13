# DevOS v1.3.0

**Autonomous AI software engineering orchestration framework.**

Analyzes → Plans → Modifies → Validates → Remembers.

Every decision is explainable, every modification is traceable, every error is reversible.

---

## What is DevOS?

DevOS is an operating system layer for autonomous software agents. Unlike AI coding assistants that simply generate code, DevOS orchestrates a complete engineering workflow:

1. **Context Analysis** — scans repositories, ranks files, builds dependency graphs
2. **Reasoning** — analyzes tasks, plans steps, scores confidence, self-reviews
3. **Execution** — generates unified diffs, applies patches with context matching
4. **Validation** — syntax checks, git status, lint, and run validation
5. **Healing Loop** — PASS → keep, RETRY → heal and retry, ROLLBACK → revert
6. **Memory** — persistent history, mistake tracking, pattern learning, solution caching

---

## Quick Start

```bash
node cli.js doctor                     # health checks
node cli.js run "your task"            # run the pipeline
node cli.js history                    # view past runs
node cli.js memory                     # error statistics
node cli.js explain                    # last execution report
node cli.js help                       # all commands
```

## Commands

| Command | Description |
|---------|-------------|
| `run` | Run the DevOS agent pipeline with a task |
| `doctor` | Run environment health checks |
| `validate` | Run all validators on the current workspace |
| `rollback` | Roll back the workspace to the last clean state |
| `history` | Show execution history |
| `memory` | Show memory and error statistics |
| `explain` | Show last execution details and logs |
| `plugins` | List available plugins |
| `dashboard` | Start local web dashboard (localhost:3000) |
| `config` | Show the current DevOS configuration |
| `help` | Show this help message |

---

## Demo

See DevOS in action:

```bash
node cli.js run "Add dark mode support to this website"
```

Full walkthrough: [`docs/demo.md`](docs/demo.md)  
Example project: [`examples/simple-web-project/`](examples/simple-web-project/)

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
│  REASONING ENGINE                                   │
│  analyze → plan → confidence → reviewer             │
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
```

## Engines

| Engine | Location | Description |
|--------|----------|-------------|
| Context | `agent/context.js` | Scan repo, rank files, build dependency graph |
| Reasoning | `agent/reasoning/` | Analyze, plan, confidence scoring, self-review |
| Executor | `agent/executor/` | PR validation, patch application, git commits |
| Patch Engine | `agent/patch-engine/` | Unified diff with context matching (skips stale hunks) |
| Validator | `agent/validator/` | Syntax, node, git, lint checks |
| Decision | `agent/pipeline/healing.js` | PASS / RETRY / ROLLBACK with healing loop |
| State Machine | `agent/state.js` | Idle → Planning → Executing → Validating → Completed |
| Memory | `agent/memory/` | History, mistakes, patterns, solutions, similarity |
| Plugins | `plugins/` | JavaScript, React, Python, Docker auto-detection |
| Tools | `agent/tools/` | ESLint, npm, tests, doctor runners |
| CLI | `agent/cli/` | Professional command-line interface |
| Dashboard | `dashboard/` | Local web UI at localhost:3000 |

---

## Project Structure

```
DevOS/
├── agent/
│   ├── cli/               Professional CLI (output, commands, router)
│   ├── executor/          Plugin actions (applyPatch, validate, commit)
│   ├── memory/            History, mistakes, patterns, solutions, search, similarity
│   ├── patch-engine/      Unified diff parser, applier (context-matched), generator
│   ├── pipeline/          Orchestration (context → reasoning → exec → validate → heal)
│   ├── reasoning/         Analyze, plan, confidence (config-driven), reviewer
│   ├── validator/         Syntax, node, git, lint + report builder
│   ├── ai/                AI providers (opencode, direct, fallback)
│   └── tools/             ESLint, npm, tests, doctor runners
├── cli.js                  Thin CLI entry point (9 lines)
├── plugins/                Extensible plugin system (javascript, react, python, docker)
├── dashboard/              Local web dashboard (server.js, index.html)
├── tests/                  Automated test suites (108 tests, 7 suites)
├── examples/               Demo project and scripts
├── docs/                   Documentation
├── config/                 Environment configuration
├── logs/                   JSON logs (context, plan, execution, report, memory)
└── workspace/              Git-managed working copy
```

---

## Plugin System

Plugins auto-detect project type and enable relevant tools. To create a plugin:

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

Built-in plugins: `javascript`, `python`, `react`, `docker`.

```bash
node cli.js plugins    # list available plugins
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
| `logs/memory-*.json` | History, mistakes, patterns, solutions |
| `logs/ai_prompt.txt` | Last AI prompt |

---

## Testing

```bash
node tests/runner.js
```

7 test suites, 108 tests covering:
- Patch engine (parser, apply, generate, round-trip)
- State machine (transitions, steps, updates)
- Memory (history, mistakes, patterns, solutions, search, similarity, recommendations)
- Plugins (loading, detection, tools, rules)
- CLI (output, router, command registry)
- Similarity (tokenize, scoring)
- Config (structure, values)

---

## Security

- **v1.2.4+:** API keys passed via environment variables to isolated Node child processes. Never in command-line arguments.
- Patch engine validates context lines before applying to prevent file corruption from stale diffs.
- No shell injection vectors in `direct.js` (uses `execFileSync` with env vars).

---

## Requirements

- Node.js 18+
- Git
- PowerShell 7 (recommended)

---

## Philosophy

Reduce friction. Automate setup. Keep environments reproducible. Build AI-ready foundations.

> "Designed and developed an autonomous AI software engineering orchestration framework with reasoning, execution, validation, rollback and memory capabilities."
