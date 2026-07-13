# DevOS v1.2.9

AI-powered development environment orchestration framework.

Every decision is explainable, every modification is traceable, every error is reversible.

## CLI Usage

```powershell
# Run the DevOS agent pipeline
node cli.js run "your task description"

# Run environment health checks
node cli.js doctor

# Validate the current workspace
node cli.js validate

# Roll back to last clean state
node cli.js rollback

# Show configuration
node cli.js config

# Show help
node cli.js help
```

## Architecture

```
Task
  │
  ▼
REASONING ENGINE         analyze → planner → confidence → reviewer
  │
  ▼
EXECUTOR                 validate PR → apply patches → commit to branch
  │
  ▼
VALIDATOR ENGINE         syntax check → node run → git status → lint
  │
  ▼
DECISION ENGINE          PASS → keep | RETRY → heal | ROLLBACK → revert
  │
  ▼
MEMORY ENGINE            history | mistakes | patterns | solutions
```

## Engines

 | Engine | Location | Responsibility |
|---|---|---|---|
| Context | `agent/context.js` | Scan repo, rank files, build dependency graph, detect exports |
| Reasoning | `agent/reasoning/` | Analyze task, plan steps, score confidence, self-review |
| Planner | `agent/reasoning/planner.js` | Build execution plan from reasoned analysis |
| Executor | `agent/executor/` | Validate PR, apply patches via unified diff, git commit |
| Patch Engine | `agent/patch-engine/` | Parse, apply, and generate unified diffs with context matching |
| Validator | `agent/validator/` | Syntax check (`node --check`), node run, git status, lint |
| Decision | `agent/pipeline/healing.js` | PASS / RETRY / ROLLBACK based on validator report |
| State Machine | `agent/state.js` | Idle → Planning → Executing → Validating → Completed / Failed / Rollback |
| Tools | `agent/tools/` | Run eslint, npm, tests, doctor checks |
| Memory | `agent/memory/` | History, mistakes, patterns, solution caching |

## Project Structure

```
DevOS/
├── agent/
│   ├── agent.js              [DEPRECATED — use agent/pipeline/]
│   ├── config.js             Configuration loader (DEVOS.* API)
│   ├── context.js            Context engine
│   ├── executor.js           Execution engine with queue
│   ├── patch.js              Patch utilities (backup, apply, validate)
│   ├── state.js              Formal state machine
│   ├── validator.js          PR/plan validators (legacy)
│   ├── ai/                   AI providers (opencode, direct, fallback + request-helper)
│   ├── executor/             Plugin actions (applyPatch, validate, commit, rollback)
│   ├── patch-engine/         Unified diff parser, applier (context-matched), generator
│   ├── pipeline/             Orchestration pipeline (context → reasoning → exec → validate → heal)
│   ├── reasoning/            Analyze, planner, confidence (config-driven), reviewer
│   ├── validator/            Syntax, node, git, lint validators + report builder
│   ├── memory/               History, mistakes, patterns, solutions
│   └── tools/                ESLint, npm, tests, doctor runners
├── cli.js                    DevOS CLI entry point
├── config/                   Environment configuration
├── docs/                     Documentation
├── scripts/                  PowerShell helpers (doctor, backup, restore, install)
├── logs/                     JSON logs (context, plan, execution, report, reasoning, memory)
└── workspace/                Git-managed working copy (agent uses this)
```

## Quick Start

```powershell
# Run the agent
devos run "your task description"
```

The agent will: analyze context → reason about the task → plan execution → apply patches → validate changes → decide PASS/RETRY/ROLLBACK.

## Configuration

All settings in `config/devos.json`:

- `validator` — enable/disable syntax, git, lint, node checks
- `tools` — enable npm, eslint, test runners
- `memory` — history/persistence limits
- `reasoning` — `confidenceThreshold` (read by confidence engine), `maxHealingRetries`
- `logging` — which JSON logs to produce

> **v1.2.5+:** `confidenceThreshold` is now read from config instead of hardcoded at 0.60.

## Logs

| Log | Description |
|---|---|
| `logs/context.json` | File list, ranking, dependency map |
| `logs/analysis.json` | Reasoning analysis output |
| `logs/reasoning-plan.json` | Structured plan from reasoning |
| `logs/confidence.json` | Confidence score and decision |
| `logs/review.json` | Self-review issues and approval |
| `logs/execution.json` | Execution queue step trace |
| `logs/report.json` | Validator report |
| `logs/state.json` | State machine transitions |
| `logs/memory-*.json` | History, mistakes, patterns, solutions |

## Security

- **v1.2.4+:** API keys for AI providers (Anthropic, OpenAI) are passed via environment variables to isolated Node child processes. Never appear in command-line arguments or process listings. No shell injection vectors in `direct.js`.
- Patch engine validates context lines before applying hunks to prevent file corruption from stale diffs.

## Requirements

- Node.js 18+
- Git
- PowerShell 7 (recommended)

## Philosophy

Reduce friction. Automate setup. Keep environments reproducible. Build AI-ready foundations.
