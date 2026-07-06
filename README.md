# DevOS v1.0

AI-powered development environment orchestration framework.

Every decision is explainable, every modification is traceable, every error is reversible.

## CLI Usage

```powershell
# Run the DevOS agent pipeline
devos run "your task description"

# Run environment health checks
devos doctor

# Validate the current workspace
devos validate

# Roll back to last clean state
devos rollback

# Show configuration
devos config
```

The CLI is automatically added to your PowerShell profile (`Microsoft.PowerShell_profile.ps1`).

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
|---|---|---|
| Context | `agent/context.js` | Scan repo, rank files, build dependency graph, detect exports |
| Reasoning | `agent/reasoning/` | Analyze task, plan steps, score confidence, self-review |
| Planner | `agent/planner.js` | Build execution plan from reasoned analysis |
| Executor | `agent/executor/` | Validate PR, apply patches via unified diff, git commit |
| Patch Engine | `agent/patch-engine/` | Parse, apply, and generate unified diffs with context |
| Validator | `agent/validator/` | Syntax check (`node --check`), node run, git status, lint |
| Decision | `agent/agent.js` | PASS / RETRY / ROLLBACK based on validator report |
| State Machine | `agent/state.js` | Idle → Planning → Executing → Validating → Completed / Failed / Rollback |
| Tools | `agent/tools/` | Run eslint, npm, tests, doctor checks |
| Memory | `agent/memory/` | History, mistakes, patterns, solution caching |

## Project Structure

```
DevOS/
├── agent/
│   ├── agent.js              Pipeline orchestrator
│   ├── config.js             Configuration loader (DEVOS.* API)
│   ├── context.js            Context engine
│   ├── planner.js            Plan builder
│   ├── executor.js           Execution engine with queue
│   ├── patch.js              Low-level patch utilities
│   ├── state.js              Formal state machine
│   ├── validator.js          PR/plan validators
│   ├── executor/             Plugin actions (applyPatch, validate, commit, rollback)
│   ├── patch-engine/         Unified diff parser, applier, generator
│   ├── reasoning/            Analyze, planner, confidence, reviewer
│   ├── validator/            Syntax, node, git, lint validators + report builder
│   ├── memory/               History, mistakes, patterns, solutions
│   └── tools/                ESLint, npm, tests, doctor runners
├── cli.js                    DevOS CLI entry point
├── config/                   Environment configuration
├── docs/                     Documentation
├── scripts/                  PowerShell automation
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
- `reasoning` — confidence threshold, max healing retries
- `logging` — which JSON logs to produce

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

## Requirements

- Node.js 18+
- Git
- PowerShell 7 (recommended)

## Philosophy

Reduce friction. Automate setup. Keep environments reproducible. Build AI-ready foundations.
