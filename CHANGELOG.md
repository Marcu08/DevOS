# DevOS Changelog

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
