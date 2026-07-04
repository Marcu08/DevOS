# DevOS Changelog

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
