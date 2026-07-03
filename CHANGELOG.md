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

**Salto:** `backup manuale + rollback custom + workspace finto` → `Git fa tutto, ogni run = branch, rollback = git reset, cronologia = vera`
