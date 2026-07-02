# ⚡ DevOS

**DevOS** is a portable, AI-powered development environment built around PowerShell, WezTerm and modern CLI tools.

Its goal is simple:

> Make every new machine feel instantly familiar in under 10 minutes.

---

## 🚀 Version

Current version: **v0.1.0 — Core Environment**

This version includes:

- Terminal configuration (WezTerm)
- PowerShell 7 setup
- Starship prompt
- zoxide navigation
- fzf integration
- basic Git workflow aliases

---

## 📂 Structure
```text
DevOS/
│
├── config/
├── docs/
├── scripts/
├── agent/ (future)
├── templates/
└── backups/
```
## 🎯 Philosophy

DevOS is built around 5 principles:

- ⚡ Speed: reduce repetitive work
- 🧠 Context: always know where you are
- 🔁 Reproducibility: same setup everywhere
- 📦 Modularity: every tool is replaceable
- 🤖 AI-ready: designed for future automation

---

## 🧭 Current Workflow

Navigation:

- `z <folder>` → jump to known directory
- `fzf-cd` → fuzzy folder search
- `cd ..` → go up one level

Git:

- `gs` → git status
- `ga` → git add .
- `gc "msg"` → commit
- `gp` → push

Search:

- `Ctrl + R` → history search
- `Tab` → autocomplete

---

## 🛠 Requirements

- Windows 10/11
- PowerShell 7+
- Git
- Node.js (for future agent layer)
- WezTerm
- Nerd Font (JetBrains Mono recommended)

---

## 📌 Goal of v1.0

DevOS will reach v1.0 when:

- fully automated setup is possible
- `doctor.ps1` exists and validates environment
- AI workflow is integrated
- configuration is fully portable

---

## 🧠 Status

This is an early-stage development environment.
Expect breaking changes before v1.0.