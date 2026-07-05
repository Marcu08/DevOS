# DevOS — Command Reference

## Agent Pipeline

### Run the agent
```powershell
node agent/agent.js "describe your task"
```
Runs the full pipeline: Context → Reasoning → Planner → Executor → Validator → Decision.

```powershell
node agent/agent.js
```
Default task: `analyze project`.

### Run with custom task
```powershell
node agent/agent.js "refactor config module"
node agent/agent.js "add error handling to executor"
node agent/agent.js "improve test coverage"
```

---

## Tools Engine

Run standalone tools without the full pipeline:

### Doctor (environment health check)
```powershell
node -e "require('./agent/tools').run('doctor')"
```
Checks: git, node, npm, workspace.

### ESLint
```powershell
node -e "require('./agent/tools').run('eslint')"
```
Auto-detects `.eslintrc` or `eslint.config.js`. Skips if not found.

### npm commands
```powershell
node -e "require('./agent/tools').run('install')"
node -e "require('./agent/tools').run('test')"
node -e "require('./agent/tools').run('npm', ['run', 'build'])"
```
Requires `package.json` in workspace.

### Tests (auto-detect)
```powershell
node -e "require('./agent/tools').run('test')"
```
Auto-detects: `jest`, `vitest`, `npm test`.

### List available tools
```powershell
node -e "console.log(require('./agent/tools').available().join(', '))"
```

---

## Logs

All logs are JSON in `logs/`:

| Command | Description |
|---|---|
| `cat logs/state.json` | Current state machine state |
| `cat logs/context.json` | File ranking, dependency map, complexity |
| `cat logs/analysis.json` | Reasoning analysis (affected files, priority) |
| `cat logs/reasoning-plan.json` | Planned steps from reasoning |
| `cat logs/confidence.json` | Confidence score and blockage status |
| `cat logs/review.json` | Self-review issues and approval |
| `cat logs/execution.json` | Execution queue with step traces |
| `cat logs/report.json` | Validator results (syntax, git, node, lint) |
| `cat logs/plan.json` | Execution plan |
| `cat logs/memory-history.json` | All past run records |
| `cat logs/memory-mistakes.json` | Tracked failures and errors |
| `cat logs/memory-patterns.json` | Success patterns per file |
| `cat logs/memory-solutions.json` | Cached solutions |

---

## State Machine

States: `Idle → Planning → Executing → Validating → Completed | Failed | Rollback`

```powershell
# View current state
cat logs/state.json | node -e "process.stdin.on('data',d=>{const s=JSON.parse(d);console.log('State:',s.machine,'Task:',s.task)})"
```

---

## Reasoning Engine

Each phase produces a log:

```powershell
# View analysis
node -e "console.log(require('./logs/analysis.json').affectedFiles?.length, 'files affected')"

# View confidence
node -e "const c = require('./logs/confidence.json'); console.log('Score:', c.confidence, c.blocked ? 'BLOCKED' : 'OK')"
```

---

## Memory Engine

### View run history
```powershell
node -e "
const h = require('./agent/memory/history');
console.log('Stats:', JSON.stringify(h.stats(), null, 2));
console.log('Recent:', JSON.stringify(h.recent(3), null, 2));
"
```

### View past mistakes
```powershell
node -e "
const m = require('./agent/memory/mistakes');
console.log('Recent errors:', JSON.stringify(m.recentErrors(5), null, 2));
"
```

### Find similar errors
```powershell
node -e "
const m = require('./agent/memory/mistakes');
console.log(JSON.stringify(m.similarTo('syntax'), null, 2));
"
```

### Learn from failure (simulate)
```powershell
node -e "
const mem = require('./agent/memory/index');
const result = mem.learnFromFailure('refactor X', 'syntax error in file.js', { file: 'agent.js', stage: 'validation' });
console.log('Similar errors:', result.similarErrors);
console.log('Suggestions:', result.suggestedPatterns.length);
"
```

---

## Patch Engine

### Generate a diff between two files
```powershell
node -e "
const pe = require('./agent/patch-engine');
const fs = require('fs');
const diff = pe.generateDiff(
  fs.readFileSync('file-old.js', 'utf-8'),
  fs.readFileSync('file-new.js', 'utf-8')
);
console.log(diff);
"
```

### Apply a diff
```powershell
node -e "
const pe = require('./agent/patch-engine');
const fs = require('fs');
const patched = pe.applyDiff(
  fs.readFileSync('file.js', 'utf-8'),
  fs.readFileSync('patch.diff', 'utf-8')
);
console.log(patched);
"
```

### Parse a diff
```powershell
node -e "
const { parse } = require('./agent/patch-engine');
const hunks = parse(fs.readFileSync('patch.diff', 'utf-8'));
console.log(hunks.length, 'hunks found');
"
```

---

## Validator Engine

### Run all validators manually
```powershell
node -e "
const ve = require('./agent/validator/index');
const report = ve.validate({ modifiedFiles: ['agent/agent.js'] });
console.log('Passed:', report.summary.passed, 'Failed:', report.summary.failed);
"
```

### Run syntax check only
```powershell
node -e "
require('./agent/validator/syntax').run({ modifiedFiles: ['agent/agent.js'] })
"
```

### Run git validator only
```powershell
node -e "
require('./agent/validator/git').run({})
"
```

### Run node validator only
```powershell
node -e "
require('./agent/validator/node').run({})
"
```

---

## Config

### View configuration
```powershell
node -e "const c = require('./agent/config'); console.log(JSON.stringify(c.config, null, 2))"
```

### Get specific config value
```powershell
node -e "const c = require('./agent/config'); console.log('Version:', c.config.version)"
```

### Config file location
```
config/devos.json
```

---

## PowerShell Scripts

### Environment health
```powershell
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1
```

### Environment setup
```powershell
powershell -ExecutionPolicy Bypass -File scripts/install.ps1
```

### PATH check
```powershell
powershell -ExecutionPolicy Bypass -File scripts/path-check.ps1
```

### Backup and restore
```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup.ps1
powershell -ExecutionPolicy Bypass -File scripts/restore.ps1
```

### Load profile
```powershell
powershell -ExecutionPolicy Bypass -File scripts/profile.ps1
```

### AI loop (legacy v0.6)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai.ps1
```

### Review and apply patches (legacy)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/review.ps1
powershell -ExecutionPolicy Bypass -File scripts/apply.ps1
```

---

## Quick Reference

```powershell
# Full agent run
node agent/agent.js "your task"

# Environment health check
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1

# Run doctor tool
node -e "require('./agent/tools').run('doctor')"

# View last execution report
cat logs/report.json | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log('Success:',r.success,'Passed:',r.summary.passed,'Failed:',r.summary.failed)})"

# View agent state
cat logs/state.json | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).machine)})"

# View memory stats
node -e "console.log(require('./agent/memory').getStats().history)"

# All config values
node -e "console.log(require('./agent/config').config)"
```
