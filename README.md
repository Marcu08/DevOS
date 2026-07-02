# ⚡ DevOS

A portable, AI-ready development environment built for Windows using PowerShell 7, WezTerm and modern CLI tools.

---

## 📌 Version

**v0.3.0 — Documentation Layer**

This version focuses on:

- Complete documentation
- Environment verification system (doctor.ps1)
- Clear workflow definition
- Reproducibility preparation

---

## 🎯 Goal

DevOS aims to provide:

> A fully reproducible developer environment that can be restored on any Windows machine in minutes.

---

## 📦 Core Tools

- PowerShell 7
- WezTerm
- Git
- Node.js
- Starship
- zoxide
- fzf
- lazygit

---

## 🧪 System Check

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1
```
Expected output:

✔ installed tools
✖ missing tools
system status overview
🧭 Core Workflow
Navigation
z <folder> → jump to directory
fzf-cd → fuzzy folder search
cd .. → go up
Git
gs → status
ga → add all
gc "msg" → commit
gp → push
Terminal
Ctrl + R → history search
Tab → autocomplete
WezTerm workspaces → project switching
📂 Project Structure
DevOS/
├── config/
├── docs/
├── scripts/
│   └── doctor.ps1
├── agent/ (future)
├── backups/
└── templates/
⚠️ Status

This project is under active development.
Breaking changes may occur before v1.0.0.

🧠 Philosophy
Reduce friction in development
Automate repetitive setup tasks
Keep environment reproducible
Build AI-ready workflow foundation

---

# 📄 STEP 2 — CREA `docs/Doctor.md`

```md
# 🧪 Doctor Script (DevOS)

## Purpose

The `doctor.ps1` script verifies that all required development tools are installed and working correctly.

---

## How to run

```powershell
powershell -ExecutionPolicy Bypass -File scripts/doctor.ps1
What it checks
Git installation
Node.js runtime
npm package manager
PowerShell version
Starship prompt
zoxide navigation tool
fzf fuzzy finder
Output meaning
✔ → tool installed and working
✖ → tool missing or not accessible in PATH
Example output
✔ Git
✔ Node
✔ npm
✔ PowerShell
✔ Starship
✔ zoxide
✔ fzf
Troubleshooting
Command not found

Ensure the tool is installed and added to PATH.

Script does not run

Run PowerShell as:

ExecutionPolicy Bypass
Notes

This script is the foundation of DevOS health monitoring.


---

# 📄 STEP 3 — CREA `docs/Workflow.md` (più serio)

```md
# ⚡ DevOS Workflow

## Philosophy

Development should always follow a predictable loop:

> Navigate → Develop → Test → Commit → Push

---

## Daily workflow

### 1. Open project

```bash
z project-name
2. Inspect changes
git status

or

lazygit
3. Work on code

Use:

WezTerm splits
VS Code (optional)
AI tools (future integration)
4. Save changes
ga
gc "message"
gp
Terminal shortcuts
Ctrl + R → history search
Tab → autocomplete
fzf-cd → folder search
Future layer
AI agent integration
context-aware terminal commands
automated git suggestions

---

# 📌 STEP 4 — Commit per v0.3.0

Nel repo:

```bash
git add .
git commit -m "docs: add v0.3.0 documentation layer"
git push