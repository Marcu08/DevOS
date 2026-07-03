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
- backupFile mantenuto come safety net opzionale
- `.gitignore` per `workspace/`, `backup/`, `logs/`

**Salto:** `backup manuale + rollback custom + workspace finto` → `Git fa tutto, ogni run = branch, rollback = git reset, cronologia = vera`

## v0.9.0 — AI FULL ENGINE (CONTEXT ENGINE)

### 🎯 Tre fondamenta prima del salto

1. **🔍 Observability** — `logs/state.json` con stato agent, branch, errori
2. **🧱 Isolamento** — `repo/` (codice vero) + `workspace/` (sandbox AI) separati
3. **🧠 PR format standard** — `{ path, patch, reason }` per multi-file reasoning reale

### 🧩 Nuovo: `agent/context.js`

- `scanRepo()` — full repo scan con file importance ranking
- `buildDependencyMap()` — analisi require/import tra file
- Weight system: `.ts/.tsx` > `.js/.jsx` > `.py` > altri
- `index.js/index.ts` = priorità massima
- Top files calcolati per prioritŕ

### 🧠 Stato sistema v0.9.0

> 🟣 **AI + Git + Context = sistema di modifica codice controllato e consapevole**

**Salto:** `patch file → git automation → script` → `context engine + multi-file reasoning`
