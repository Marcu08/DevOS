# DevOS Changelog

## v1.0.0 — STABILIZATION (2026-07-05)

- Final architecture: Context → Reasoning → Planner → Executor → Validator → Decision → Memory
- `agent/agent.js` — full healing loop with error analysis, memory integration, tool auto-run
- `README.md` — rewritten with complete architecture documentation
- `config/devos.json` — unified config for all engines (validator, tools, memory, reasoning, logging)

**Salto:** `feature incrementali` → `piattaforma stabile con 10 engines integrati`

## v0.9.9 — SELF-HEALING (2026-07-05)

- `agent/agent.js` — healing loop: on failure → learn from memory → run pre-healing tools → retry with reasoning
- `agent/memory/` — integrated into healing flow: `learnFromFailure()` returns similar errors and patterns
- `agent/tools/` — auto-run `npm install` before retry if node validator failed
- Max retries from config (`validator.retry`), error tracking per attempt

**Salto:** `retry semplice` → `healing loop con memoria, tool automatici e analisi errori`

## v0.9.8 — TOOL ENGINE (2026-07-05)

- `agent/tools/` — modular tool runners: eslint, npm, tests, doctor
- `agent/tools/index.js` — registry with `Tool.run("name", args)` interface
- Auto-detection: eslint config, test framework (jest/vitest/npm), package.json
- Doctor tool checks git, node, npm, workspace health

**Salto:** `comandi sparsi nel codice` → `tool engine con registry e auto-detection`

## v0.9.7 — MEMORY ENGINE (2026-07-05)

- `agent/memory/` — persistent memory: history, mistakes, patterns, solutions
- `agent/memory/history.js` — logs all runs with status, confidence, duration
- `agent/memory/mistakes.js` — tracks failures with error, file, stage
- `agent/memory/patterns.js` — learns from success/failure per file pattern
- `agent/memory/solutions.js` — caches successful solutions keyed by task
- `agent/memory/index.js` — `learnFromFailure()` returns similar past errors + patterns

**Salto:** `senza stato tra run` → `memoria persistente con apprendimento da errori`

## v0.9.6 — PATCH ENGINE (2026-07-05)

- `agent/patch-engine/` — unified diff engine: parser, applier, generator, matcher
- `agent/patch-engine/parser.js` — parses `@@ -s,c +s,c @@` hunks with context lines
- `agent/patch-engine/applier.js` — applies hunks with line offset tracking
- `agent/patch-engine/generator.js` — generates proper unified diffs from old/new content
- `agent/patch-engine/matcher.js` — context line matching for robust patch application
- `agent/utils/diff.js` — replaced by new patch-engine

**Salto:** `diff testuale semplice` → `unified diff engine con parsing e generazione reali`

## v0.9.5 — AI REASONING ENGINE (2026-07-05)

- `agent/reasoning/` — modular reasoning pipeline: analyze → planner → confidence → reviewer
- `agent/reasoning/analyze.js` — extracts affected files, priority, complexity from context
- `agent/reasoning/planner.js` — generates structured plans with trace/modify/validate steps
- `agent/reasoning/confidence.js` — confidence scoring, blocks execution if < 0.60 threshold
- `agent/reasoning/reviewer.js` — self-review: detects risk, missing steps, high complexity
- `agent/reasoning/index.js` — orchestrator: saves analysis.json, reasoning-plan.json, confidence.json, review.json
- `agent/agent.js` — pipeline: context → reasoning → planner → executor → validator → decision

**Salto:** `esecuzione diretta senza analisi` → `reasoning engine con analisi, confidence score, self-review e blocco sotto soglia`

## v0.9.4 — VALIDATOR ENGINE (2026-07-05)

- `agent/validator/` — modular validators: syntax (`node --check`), node (`node index.js`), git (branch, clean, conflicts), lint (eslint)
- `agent/validator/index.js` — orchestrator: loads config, runs enabled validators, builds report
- `agent/validator/report.js` — structured report builder → `logs/report.json`
- `agent/agent.js` — Decision Engine: PASS / RETRY / ROLLBACK based on validator report
- `config/devos.json` — new section: `validator { syntax, git, lint, node, command, retry }`
- `executor.js` — queue simplified: validate PR → apply patches → commit (validation delegated to Validator Engine)

**Salto:** `esecuzione senza verifica esterna` → `validator engine modulare con decision engine e report strutturato`

## v0.9.3 — EXECUTION ENGINE (2026-07-05)

- `state.js` — formal State Machine: Idle → Planning → Executing → Validating → Completed | Failed | Rollback
- `executor.js` — Execution Engine with queue, per-step states, retry policies
- `executor/` — plugin actions directory (applyPatch, validate, commit, rollback, runChecks)
- `validator.js` — independent validation module (validatePlan, validatePR, validateContext)
- `agent.js` — pipeline uses state.transition(), validator, executor.run()
- `logs/execution.json` — structured execution log with step traces

**Salto:** `esecuzione lineare con retry fisso` → `execution engine con state machine, coda, plugin e retry policy dichiarativa`

## v0.9.2 — DECLARATIVE PIPELINE (2026-07-05)

- `agent.js` — rewritten as declarative pipeline: `main` → `initialize` → `runContext` → `runPlanner` → `runExecutor` → `runValidator` → `finish`
- `agent/config.js` — new API: `DEVOS.root`, `DEVOS.workspace`, `DEVOS.logs`, `DEVOS.backup` (instead of `config.get(...)`)
- `agent/context.js` — added `complexity` per file (lines, functions, imports, exports)
- `agent/context.js` — `rankFile()` now scores structural files (package.json, README, tsconfig, docker, eslint, workflows)
- `agent/executor.js` — new module: `generatePR`, `validate`, `selfHeal`, `commit`

**Salto:** `agent.js orchestratore generico` → `pipeline dichiarativa con complexity + ranking strutturale`

## v0.9.1 — ARCHITECTURE REFACTOR (2026-07-05)

- `agent/config.js` — centralized configuration reader from `config/devos.json`
- `agent/workspace.js` — extracted workspace management (prepare, branch, snapshot, rollback)
- `agent/state.js` — extracted runtime state management (init, update, persist)
- `agent/patch.js` — extracted patch/PR logic (apply, validate, selfHeal)
- `agent/agent.js` — reduced from 244 to ~90 lines (pure orchestrator)
- `agent/context.js` — enriched with `language` detection, `exportsMap` per file
- `agent/index.js` — now a proper entry point (calls agent.js)
- All hardcoded `C:\DevOs` paths removed from JS modules (use `config/devos.json`)
- All PowerShell scripts use `$PSScriptRoot` instead of hardcoded paths
- `config/devos.json` — fixed invalid JSON (missing comma), version bumped to 0.9.0
- `README.md` — rewritten cleanly (removed prompt/step artifacts)
- `scripts/lib.ps1` — derives root from `$PSScriptRoot`, proper config fallback

**Salto:** `codice monolitico + path hardcoded + JSON rotto` → `modularizzazione + config centralizzata + contesto ricco`

## v0.8.3 — REAL DIFF PATCH ENGINE

- Nuovo modulo `agent/utils/diff.js` con parser unified diff
- `applyPatch()` ora usa `applyUnifiedDiff()` invece di append
- `generatePR()` ora genera diff veri in formato unified
- rollback reale preservato
- modifica selettiva file, no overwrite

**Salto:** `file = content + diff (fake)` → `file = unified diff → parsed → applied riga per riga`

## v0.8.4 — GIT MODE (REAL VERSIONING + ROLLBACK)

- workspace = repo git vero
- `git()` utility per comandi nativi
- `createAgentBranch()` — branch `agent/<task>-<timestamp>` per ogni run
- `snapshot()` — commit automatico prima delle modifiche
- `rollback() = git reset --hard` (non più copia manuale)
- `selfHeal()` ora crea branch + snapshot + loop safe
- main flow committa su successo

**Salto:** `backup manuale + rollback custom + workspace finto` → `Git fa tutto, ogni run = branch, rollback = git reset, cronologia = vera`

## v0.9.0 — CONTEXT ENGINE (REPO-AWARE FOUNDATION)

- `agent/context.js` — nuovo modulo core
- `scanRepo()` — scansione ricorsiva del repository
- `rankFile()` — scoring per importanza (index > .ts > .js > .json)
- `buildDependencyMap()` — analisi require/import tra file
- `buildContext()` — contesto strutturato con topFiles + dipendenze
- `logs/context.json` — contesto persistito su disco
- `logs/state.json` — stato runtime agent (task, status, branch, error)
- PR format standardizzato: `{ path, patch, reason }`
- `generatePR()` ora usa topFiles dal context engine

**Salto:** `percezione casuale del repo` → `ranked system + dependency graph`

### Architettura v0.9.0

```
buildContext()
  ├── scanRepo()     → file list
  ├── rankFile()     → score per file
  └── buildDependencyMap() → require/import graph
       │
       ▼
  context.json + state.json → PR generation
```
