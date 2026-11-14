# DevOS Workflow

## Navigation

- `z <folder>` — jump to a folder
- `fzf-cd` — fuzzy folder search

## Development loop

1. Open the project.
2. Use the DevOS terminal workspace.
3. Edit code.
4. Stage, commit, and push.

## AI workflow

### Single-agent pipeline

```bash
node cli.js run "task description"
```

Flow:

```
Context analysis → Reasoning → Planning → Execution → Validation → Decision → Memory
```

### Multi-agent orchestration

```bash
node cli.js orchestrate "task description"
```

Flow:

```
Orchestrator → Planner Agent → Coder Agent → Reviewer Agent → Security Agent → Decision Engine
```

### GitHub integration

```bash
node cli.js issue analyze <number>
node cli.js pr review <number>
node cli.js pr create <title>
```

Requires `GITHUB_TOKEN` or `GH_TOKEN`.

### Security scan

```bash
node cli.js security
```

Scans for secrets, unsafe patterns, vulnerable dependencies, permission issues, and
common vulnerabilities.

### Performance checks

```bash
npm run bench
npm run bench -- --check
```

The context engine caches unchanged projects in `logs/cache/`. Set
`DEVOS_NO_CACHE=1` to bypass it.

## Architecture

```
Task
  │
  ▼
┌─────────────────────────────────────────────┐
│ CONTEXT ENGINE                              │
│ scan → rank → dependency map                │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│ REASONING ENGINE                            │
│ analyze → plan → confidence → self-review   │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│ EXECUTOR → VALIDATOR → DECISION             │
│ PASS / RETRY / ROLLBACK                     │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│ MEMORY → EXPLAINABILITY                     │
│ learn → persist → explain                   │
└─────────────────────────────────────────────┘
```
