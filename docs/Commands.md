# DevOS — Command Reference

## CLI Usage

All DevOS commands are run via the `cli.js` entry point:

```powershell
node cli.js <command> [args]
```

---

## Available Commands

### `node cli.js run` — Run the agent pipeline

```powershell
node cli.js run "refactor config module"
node cli.js run "add error handling to executor"
node cli.js run "improve test coverage"
node cli.js run                # default task: "analyze project"
```

Example output:
```
═══════════════════════════════════════════
 Task: refactor config module
═══════════════════════════════════════════
   ◐ Planning...
   ◐ Executing...
   ◐ Validating...
   ◐ Completed...

   ✓ Planning    done
   ✓ Executing   done
   ✓ Validating  done
   ✓ Completed   done
```

---

### `node cli.js orchestrate` — Multi-agent orchestration (v1.4.0)

```powershell
node cli.js orchestrate "refactor config module"
```

Runs the full multi-agent pipeline: planner → coder → reviewer → security → decision engine.

---

### `node cli.js doctor` — Run health checks

```powershell
node cli.js doctor
```

Checks: git, node, npm, workspace.

Example output:
```
═══════════════════════════════════════════
 Running environment health checks...
═══════════════════════════════════════════

   ✓ git: git version 2.42.0
   ✓ node: v20.11.0
   ✓ npm: 10.2.4
   ✓ workspace: main

 Result: ✓ All checks passed
```

---

### `node cli.js validate` — Run all validators

```powershell
node cli.js validate
```

Runs syntax, git, node, and lint validators on the workspace.

Example output:
```
═══════════════════════════════════════════
 Validating workspace...
═══════════════════════════════════════════

   ◐ syntax
   ◐ git
   ◐ node
   ◐ lint

  [VALIDATOR] ✓ syntax (120ms)
  [VALIDATOR] ✓ git (45ms)
  [VALIDATOR] ✓ node (30ms)
  [VALIDATOR] — lint (skipped)

 Validation summary:
   Passed:  3
   Failed:  0
   Skipped: 1
```

---

### `node cli.js rollback` — Roll back workspace

```powershell
node cli.js rollback
```

Resets all uncommitted changes via `git reset --hard`.

---

### `node cli.js security` — Security scan (v1.4.0)

```powershell
node cli.js security
```

Scans the project with 5 modules:
- Secrets (API keys, passwords, tokens, private keys)
- Patterns (eval, innerHTML, code injection, path traversal)
- Dependencies (unsafe packages, loose versions, malicious scripts)
- Permissions (sensitive files, .gitignore compliance)
- Vulnerabilities (common mistakes, debug logging, empty catches)

---

### `node cli.js history` — Show execution history

```powershell
node cli.js history
```

---

### `node cli.js memory` — Memory and error statistics

```powershell
node cli.js memory
```

Shows cross-store search, similarity scoring, and recommendation engine results.

---

### `node cli.js explain` — Explain decisions (v1.4.0 enhanced)

```powershell
node cli.js explain                    # latest decision
node cli.js explain "task name"        # search by task
node cli.js explain --all              # all recent explanations
```

Displays reasoning, confidence score, evidence, files changed, and similar solutions.

---

### `node cli.js plugins` — Plugin management (v1.4.0 enhanced)

```powershell
node cli.js plugins                         # list installed
node cli.js plugins search <query>          # search marketplace
node cli.js plugins install <name>          # install a plugin
node cli.js plugins uninstall <name>        # uninstall
node cli.js plugins info <name>             # show plugin manifest
```

---

### `node cli.js issue` — GitHub issue operations (v1.4.0)

```powershell
node cli.js issue analyze <number>    # analyze an issue
```

Requires `GITHUB_TOKEN` or `GH_TOKEN` environment variable.

---

### `node cli.js pr` — GitHub PR operations (v1.4.0)

```powershell
node cli.js pr review <number>        # review a pull request
node cli.js pr create <title>         # create a pull request
```

Requires `GITHUB_TOKEN` or `GH_TOKEN` environment variable.

---

### `node cli.js dashboard` — Start web dashboard

```powershell
node cli.js dashboard
```

Opens local web UI at `http://localhost:3000`.

---

### `node cli.js config` — Show configuration

```powershell
node cli.js config
```

---

### `node cli.js help` — Show this help

```powershell
node cli.js help
```

---

## Logs (JSON)

All pipeline logs are written as JSON to `logs/`:

| File | Description |
|---|---|
| `logs/state.json` | Current state machine state |
| `logs/context.json` | File ranking, dependency map, complexity |
| `logs/analysis.json` | Reasoning analysis (affected files, priority) |
| `logs/reasoning-plan.json` | Planned steps from reasoning |
| `logs/confidence.json` | Confidence score and blockage status |
| `logs/review.json` | Self-review issues and approval |
| `logs/execution.json` | Execution queue with step traces |
| `logs/report.json` | Validator results (syntax, git, node, lint) |
| `logs/explain.json` | Decision explanations (v1.4.0) |
| `logs/plan.json` | Execution plan |
| `logs/memory-history.json` | All past run records |
| `logs/memory-mistakes.json` | Tracked failures and errors |
| `logs/memory-patterns.json` | Success patterns per file |
| `logs/memory-solutions.json` | Cached solutions |
| `logs/ai_prompt.txt` | Last AI prompt sent to provider |
| `logs/ai_result.json` | Last AI provider result (patch/PR) |
| `logs/ai_output.txt` | Raw AI provider stdout (if any) |

---

## Module Access (direct `node -e`)

Skip the CLI and access engine modules directly:

```powershell
# View current state
node -e "const s=require('./logs/state.json');console.log('State:',s.machine,'Task:',s.task)"

# View last execution report
node -e "const r=require('./logs/report.json');console.log('Success:',r.success,'Passed:',r.summary.passed,'Failed:',r.summary.failed)"

# View memory stats
node -e "console.log(require('./agent/memory').getStats().history)"

# View config
node -e "console.log(require('./agent/config').config)"

# List available tools
node -e "console.log(require('./agent/tools').available().join(', '))"
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

### Cross-store search (v1.4.0)
```powershell
node -e "
const { search } = require('./agent/memory/index');
console.log(JSON.stringify(search('syntax error', { stores: ['mistakes','solutions'] }), null, 2));
"
```

### Similarity scoring (v1.4.0)
```powershell
node -e "
const { similarity } = require('./agent/memory/index');
console.log(similarity('fix syntax error in parser', 'fix parser syntax bug'));
"
```

### Recommendations (v1.4.0)
```powershell
node -e "
const { recommend } = require('./agent/memory/index');
console.log(JSON.stringify(recommend('refactor config'), null, 2));
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

Features:
- **Context matching:** hunks are validated against file content before applying. If context lines don't match, the hunk is skipped instead of corrupting the file.
- **Bottom-up application:** multiple hunks are applied in reverse order so earlier changes don't invalidate later line numbers.
- **Window search:** hunks search ±5 lines from the expected position for matching context.

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

### Run single validator
```powershell
node -e "require('./agent/validator/syntax').run({ modifiedFiles: ['agent/agent.js'] })"
node -e "require('./agent/validator/git').run({})"
node -e "require('./agent/validator/node').run({})"
```

---

## AI Provider Abstraction (v1.4.0)

```powershell
# Generate with preferred provider
node -e "
const providers = require('./providers/index');
providers.generate('Write a hello world function', 'openai').then(console.log);
"
```

Available providers: `openai`, `anthropic`, `deepseek`, `local`.

Auth via environment variables: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`.

---

## Security Agent (v1.4.0)

```powershell
# Run security scan
node -e "
const security = require('./agent/security/index');
security.scan().then(results => console.log(JSON.stringify(results, null, 2)));
"
```

---

## Explainability Engine (v1.4.0)

```powershell
# View decision explanations
node -e "
const explain = require('./agent/explain/index');
console.log(JSON.stringify(explain.getDecisions(), null, 2));
"
```

---

## Tools Engine (direct)

```powershell
# Doctor
node -e "require('./agent/tools').run('doctor')"

# ESLint
node -e "require('./agent/tools').run('eslint')"

# npm commands
node -e "require('./agent/tools').run('install')"
node -e "require('./agent/tools').run('test')"
node -e "require('./agent/tools').run('npm', ['run', 'build'])"

# Tests auto-detect
node -e "require('./agent/tools').run('test')"
```

---

## PowerShell $PROFILE Commands

Available in every terminal session:

### AI / Agent

```powershell
ai                  # Open opencode in current directory
ai "prompt"         # Run opencode with a prompt
dev-ai              # Analyze project and open AI workflow
agent "task"        # Collect context then open opencode
agent-run "task"    # Quick AI run with prompt
```

### Navigation

```powershell
fzf-cd              # Fuzzy-find directory
ctrlp               # Fuzzy-find file and copy path
zz                  # Deep directory search with fzf + zoxide
```

### Git

```powershell
gcommit "message"   # Stage all and commit
gp                  # Push current branch
```

### Project Info

```powershell
dev                 # Full context: location, git status, recent files + VS Code
proj                # Quick project overview
```

### Shortcuts

```powershell
c                   # clear screen
ll                  # Get-ChildItem -Force
..                  # Set-Location ..
g / gitui           # open lazygit
```
