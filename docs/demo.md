# DevOS Demo: Dark Mode Addition

This demo shows DevOS analyzing a real project, planning changes, applying patches, and validating the result.

## Scenario

**User input:**
```
Add dark mode support to this website
```

**Target project:** `examples/simple-web-project/` — a 3-page HTML website with CSS styling and JavaScript.

## Single-Agent Workflow

```
User input
    │
    ▼
[1] Context Analysis
    ├── scan repository (3 files found)
    ├── rank files by importance
    └── build dependency map
    │
    ▼
[2] Reasoning Engine
    ├── analyze task requirements
    ├── identify affected files
    └── assess complexity and risk
    │
    ▼
[3] Planning
    ├── create modification steps
    └── assign confidence score
    │
    ▼
[4] Execution
    ├── validate PR structure
    ├── apply patches to files
    └── commit changes
    │
    ▼
[5] Validation
    ├── syntax check
    ├── git status
    └── lint
    │
    ▼
[6] Decision
    ├── PASS → keep changes
    ├── RETRY → heal and retry
    └── ROLLBACK → revert
```

## Multi-Agent Workflow (v1.4.0)

```
User input
    │
    ▼
[1] ORCHESTRATOR
    ├── assigns task to Planner Agent
    ├── passes context between agents
    └── collects results
    │
    ▼
[2] PLANNER AGENT
    ├── task analysis
    ├── risk assessment
    └── step planning
    │
    ▼
[3] CODER AGENT
    ├── code generation
    └── patch creation
    │
    ▼
[4] REVIEWER AGENT
    ├── code review
    ├── quality scoring
    └── issue detection
    │
    ▼
[5] SECURITY AGENT
    ├── secrets scan
    ├── pattern analysis
    ├── dependency check
    ├── permission audit
    └── vulnerability detection
    │
    ▼
[6] DECISION ENGINE
    ├── PASS → keep and commit
    ├── RETRY → heal and retry
    └── ROLLBACK → revert
```

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Task: Add dark mode support to this website
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ◐ Context analysis
   ◐ Planning
   ◐ Executing
   ◐ Validating
   ◐ Completed

   ✓ Context analysis    done
   ✓ Planning           done
   ✓ Executing          done
   ✓ Validating         done
   ✓ Completed          done

 ✓ Task completed successfully
   Confidence: 85%
   3 execution steps
```

## Files Modified

| File | Change |
|------|--------|
| `style.css` | Added `@media (prefers-color-scheme: dark)` rules, CSS variables |
| `index.html` | Added `data-theme` attribute support |
| `script.js` | Added theme toggle logic |

## Running the Demo

```bash
# From the DevOS root directory:
node cli.js run "Add dark mode support to this website"

# Or use the demo script:
bash examples/run-demo.sh

# Or use multi-agent orchestration:
node cli.js orchestrate "Add dark mode support to this website"
```

## What DevOS Does

1. **Scans** the project to understand file structure and dependencies
2. **Analyzes** the request to determine what changes are needed
3. **Plans** the modifications file by file
4. **Generates** unified diffs with context
5. **Applies** patches with context matching (skips stale hunks)
6. **Validates** the result (syntax, git, node, lint)
7. **Reviews** with multi-agent pipeline (v1.4.0)
8. **Scans** for security issues (v1.4.0)
9. **Decides** PASS, RETRY, or ROLLBACK

## Expected Result

After DevOS completes, the website will have:

- Dark color scheme that activates based on system preference
- Smooth transitions between light/dark modes
- Proper contrast ratios for accessibility
- Backward-compatible with browsers that don't support `prefers-color-scheme`
