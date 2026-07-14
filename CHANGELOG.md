# DevOS Changelog

## v2.0.0 — PLUGIN FRAMEWORK (2026-07-14)

### Plugin Framework v2 Architecture
- `plugins/manager.js` — new PluginManager class (single source of truth for plugin loading, validation, caching, detection)
- `plugins/registry/tools.js` — ToolsRegistry with dynamic plugin tool registration
- `plugins/registry/validators.js` — ValidatorsRegistry with plugin validator support
- `plugins/registry/commands.js` — CommandsRegistry with plugin command support
- `plugins/index.js` — rewritten as backward-compatible facade delegating to PluginManager

### Dynamic Plugin Discovery
- Support both `plugins/name.js` and `plugins/name/index.js` formats
- Existing single-file plugins continue to work unchanged
- Plugin directories with `index.js` are automatically discovered

### Context Augmenters (First Runtime Extension Point)
- Plugins can export `contextAugmenters` array to enrich the context object
- Executed during `context.build()` after detection
- Receive and can mutate the context before AI reasoning

### Prompt Injectors (AI Teaching)
- Plugins can export `promptInjectors` array to inject rules into the AI prompt
- V1 plugin `rules` arrays are automatically converted to prompt injectors
- Injected rules appear in the "Project Rules" section of the AI prompt
- Auto-included in `buildPrompt()` via `ctx._pluginPromptInjections`

### Plugin Descriptor Validation
- Validates: duplicate names, invalid field types, unknown fields, malformed detect rules
- Validation errors never crash DevOS — logged as warnings
- Unknown plugin fields are reported with descriptive errors
- V1 plugins detected and logged with upgrade hint

### Extension Registries (Abstraction Layer)
- ToolsRegistry wraps existing `agent/tools/` with plugin registration API
- ValidatorsRegistry wraps existing `agent/validator/` with plugin validator support
- CommandsRegistry wraps existing `agent/cli/commands/` with plugin command support
- All registries preserve backward compatibility

### PluginManager Public API
- `get()`, `getAll()`, `getActive()`, `isActive()`, `detect()`, `available()`
- `getContextAugmenters()`, `runContextAugmenters()`
- `getPromptInjectors()`, `collectPromptInjections()`
- `getWarnings()` for validation and load errors

### Backward Compatibility
- All existing v1 plugins (javascript, python, react, docker, graphql) work unchanged
- All existing `plugins/index.js` exports preserved
- All existing tests pass without modification
- V1 `rules` → auto-converted to prompt injectors
- V1 `tools` → auto-collected in enabled tools set

### Version Bump
- `config/devos.json` → 2.0.0
- `version.json` → 2.0.0

## v1.4.0 — INTELLIGENT ENGINEERING (2026-07-13)

### Multi-Agent Architecture
- `agents/` — new coordinated agent system with planner, coder, reviewer, security agents
- `agents/orchestrator.js` — orchestrator that assigns tasks, passes context, collects results, decides
- `agent/pipeline/index.js` — new `orchestrate()` entry point for multi-agent pipeline
- CLI: `node cli.js orchestrate <task>` — run the full multi-agent workflow
- Each agent has consistent `analyze()`, `execute()`, `review()` interface

### GitHub Integration
- `agent/github/` — native GitHub API integration (no external CLI required)
- `agent/github/issues.js` — issue reading, comment fetching, issue analysis
- `agent/github/pr.js` — PR review, file listing, commit fetching, PR creation
- `agent/github/api.js` — Node.js native `https` API client with token auth
- CLI: `node cli.js issue analyze <id>`, `node cli.js pr review <id>`, `node cli.js pr create <title>`

### Explainability Engine
- `agent/explain/` — records every important decision with full traceability
- Captures: reasoning, confidence score, evidence, files changed, similar solutions, decision
- Persists to `logs/explain.json` with 50-entry rolling window
- CLI: enhanced `node cli.js explain` with rich decision display, search by task, --all flag

### Security Agent
- `agent/security/` — autonomous security reviewer with 5 scanning modules
- `agent/security/secrets.js` — API keys, passwords, tokens, private keys (8 patterns)
- `agent/security/patterns.js` — eval, innerHTML, code injection, path traversal (20 rules)
- `agent/security/dependencies.js` — unsafe packages, loose versions, malicious scripts
- `agent/security/permissions.js` — sensitive files, .gitignore compliance
- `agent/security/vulnerabilities.js` — common coding mistakes, debug logging
- Security results influence pipeline: PASS / RETRY / ROLLBACK
- CLI: `node cli.js security`

### Plugin Marketplace
- `plugins/marketplace.json` — marketplace registry with 10 available plugins
- `plugins/.installed.json` — tracks installed plugins
- New features: `search()`, `install()`, `uninstall()`, `getManifest()`
- CLI: `node cli.js plugins search|install|uninstall|info`

### AI Provider Abstraction
- `providers/` — unified provider interface for AI backends
- `providers/openai.js`, `anthropic.js`, `deepseek.js`, `local.js`
- Each implements: `generate()`, `analyze()`, `review()`
- `providers/index.js` — provider manager with automatic fallback chain
- API keys via environment variables: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`

### Testing (286 Tests)
- 13 test suites, 286 tests, 100% passing rate
- New suites: `agents.test.js` (28 tests), `github.test.js` (22 tests), `security.test.js` (18 tests), `explain.test.js` (15 tests), `providers.test.js` (17 tests), `marketplace.test.js` (12 tests)
- Test runner now supports async test suites

### Documentation
- README completely updated: multi-agent architecture diagram, GitHub workflow, security workflow, provider guide
- CHANGELOG updated with all v1.4.0 changes
- New sections: Multi-Agent Architecture, GitHub Integration, Security Agent, AI Providers, Plugin Marketplace

## v1.3.0 — PROFESSIONAL PLATFORM (2026-07-13)

### CLI Experience
- `agent/cli/` — new modular CLI system with colored output, progress indicators, tables
- `agent/cli/output.js` — ANSI color utilities, icons, banners, status lines
- `agent/cli/commands/` — 10 commands: run, doctor, validate, rollback, config, help, history, memory, explain, plugins, dashboard
- `cli.js` — reduced to 9-line thin wrapper

### Demo Workflow
- `examples/simple-web-project/` — 3-page HTML website for dark-mode demo
- `examples/run-demo.sh` — demo runner script
- `docs/demo.md` — full workflow documentation with architecture diagram

### Enhanced Memory Engine
- `agent/memory/search.js` — cross-store search (by task, error, file)
- `agent/memory/similarity.js` — token-based similarity scoring for task/mistake/solution matching
- `agent/memory/recommend.js` — recommendation engine with warnings and suggestions based on past failures
- Pipeline healing loop now logs memory recommendations

### Plugin System
- `plugins/index.js` — extensible plugin loader with auto-detection, tool discovery, project rules
- `plugins/javascript.js` — JavaScript project plugin
- `plugins/python.js` — Python project plugin
- `plugins/react.js` — React project plugin
- `plugins/docker.js` — Docker project plugin
- Integrated into pipeline context builder

### Local Web Dashboard
- `dashboard/server.js` — lightweight Node HTTP server with JSON API
- `dashboard/index.html` — responsive dark-themed dashboard with auto-refresh
- Shows: agent state, validation results, memory stats, execution steps, history
- Command: `node cli.js dashboard` → `localhost:3000`

### Testing System
- `tests/runner.js` — automated test runner with discovery, ANSI output, timing
- 7 test suites, 108 tests, 100% passing rate
- Coverage: patch engine, state machine, memory, plugins, CLI, similarity, config

### Documentation
- README completely rewritten: architecture diagram, commands table, engines, plugin development
- Updated CHANGELOG with all v1.3.0 changes

## v1.2.9 — BOTTOM-UP HUNK APPLICATION (2026-07-13)

- `patch-engine/applier.js` — hunks applied in reverse order (bottom-up) so earlier changes don't invalidate later line numbers
- `patch-engine/applier.js` — fixed oldStart=0 (new file) edge case: appends instead of overwriting
- `patch-engine/applier.js` — fixed splice offset to include ctxBefore in before slice

## v1.2.8 — LEGACY CODE REMOVAL (2026-07-13)

- `agent/patch.js` — removed `selfHeal()` (legacy healing loop, never called from new pipeline)
- `agent/patch.js` — cleaned orphan imports (`ai`, `workspace`)

## v1.2.7 — DEAD CODE CLEANUP (2026-07-13)

- Removed 6 dead v0.6 PowerShell scripts (`ai.ps1`, `review.ps1`, `apply.ps1`, `context.ps1`, `apply-pr.ps1`, `review-pr.ps1`)
- Removed 4 empty doc placeholders (`AI.md`, `Git.md`, `PowerShell.md`, `Terminal.md`)

## v1.2.6 — OPENCODE PARAMETER FIX (2026-07-13)

- `agent/ai/index.js` — `opencode.run()` now receives `task` as second argument (was `undefined`, causing broken PR titles)

## v1.2.5 — CONFIG-DRIVEN CONFIDENCE (2026-07-13)

- `agent/reasoning/confidence.js` — threshold now read from `config/devos.json → reasoning.confidenceThreshold` instead of hardcoded `0.60`
- Falls back to `0.6` if not configured

## v1.2.4 — AI PROVIDER SECURITY (2026-07-13)

- `agent/ai/direct.js` — replaced `curl` via `execSync` (shell injection risk, API key visible in `ps`) with isolated Node child process
- `agent/ai/request-helper.js` — new HTTPS request helper executed via `execFileSync`; API key passed via `DEVOS_AI_KEY` env var, never in command line
- No shell injection, no credential exposure in process listings

## v1.2.3 — STEP TYPE PROPAGATION (2026-07-13)

- `agent/state.js` — `addStep()` now copies `type` from `stepDef` to the step object
- `agent/executor/validate.js` — was receiving `step.type === undefined` because `type` was not propagated; PR validation was effectively a no-op

## v1.2.2 — DEPRECATE SELF-EXECUTING AGENT (2026-07-13)

- `agent/agent.js` — removed `main()` auto-execution at module scope
- Now only runs when `require.main === module` (direct execution)
- Exported functions (`main`, `initialize`, `runContext`, `runReasoning`, etc.) for backwards compatibility

## v1.2.1 — PATCH ENGINE CONTEXT MATCHING (2026-07-13)

- `patch-engine/applier.js` — `apply()` now validates context lines before splicing hunks
- New `findHunkPosition()` — verifies `ctxBefore` + `removed` lines match at expected position (with ±5 line window)
- Stale hunks (context mismatch) are skipped instead of corrupting the file
- Previously the applier blindly spliced at `hunk.oldStart - 1` regardless of file state

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
