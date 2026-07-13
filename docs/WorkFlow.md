# DevOS Workflow

## Navigation

- z <folder> → jump instantly
- fzf-cd → fuzzy folder search

## Development Loop

1. Open project
2. Use dev terminal workspace
3. Edit code
4. Git stage → commit → push

## AI Workflow

### Single-Agent Pipeline
```
node cli.js run "task description"
```
Context Analysis → Reasoning → Planning → Execution → Validation → Decision → Memory

### Multi-Agent Orchestration (v1.4.0)
```
node cli.js orchestrate "task description"
```
Orchestrator → Planner Agent → Coder Agent → Reviewer Agent → Security Agent → Decision Engine

### GitHub Integration (v1.4.0)
```
node cli.js issue analyze <number>
node cli.js pr review <number>
node cli.js pr create <title>
```

### Security Scan (v1.4.0)
```
node cli.js security
```
Scans for: secrets, unsafe patterns, vulnerable dependencies, permissions, common vulnerabilities.

## Architecture Diagram

```
Task
  │
  ▼
┌─────────────────────────────────────┐
│  CONTEXT ENGINE                     │
│  scan → rank → dependency map       │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  MULTI-AGENT ORCHESTRATOR           │
│  planner → coder → reviewer → sec   │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  EXECUTOR → VALIDATOR → DECISION    │
│  PASS / RETRY / ROLLBACK            │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  MEMORY → EXPLAINABILITY            │
│  learn → persist → explain          │
└─────────────────────────────────────┘
```
