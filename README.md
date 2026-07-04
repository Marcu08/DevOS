# DevOS

A portable, AI-ready development environment for Windows — powered by PowerShell 7, WezTerm, and a context-aware autonomous agent.

## Features

- **Context Engine** — scans your repo, ranks files by importance, builds a dependency graph
- **Autonomous Agent** — creates branches, applies patches, validates, rolls back on failure
- **Self-Healing Loop** — retries with error feedback when validation fails
- **Git-First Workspace** — every agent run creates a branch with snapshots
- **Portable** — restore your full environment on any Windows machine in minutes

## Quick Start

```powershell
# Check your environment
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1

# Run the agent
node agent/agent.js "your task description"
```

## Requirements

- PowerShell 7
- Git
- Node.js
- WezTerm (recommended)
- Starship, zoxide, fzf (optional)

## Project Structure

```
DevOS/
├── agent/          # Autonomous agent (context, planner, diff engine)
├── config/         # Environment configuration
├── docs/           # Documentation
├── scripts/        # PowerShell automation
├── workspace/      # Git-managed working copy (agent uses this)
└── version.json    # Single source of truth for version
```

## Status

Active development — pre-1.0. Breaking changes may occur.

## Philosophy

Reduce friction. Automate setup. Keep environments reproducible. Build AI-ready foundations.
