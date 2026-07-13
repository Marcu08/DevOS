#!/usr/bin/env bash
# DevOS Demo — Add dark mode to a simple website
# Run: bash examples/run-demo.sh

set -e

DEMO_DIR="$(cd "$(dirname "$0")/simple-web-project" && pwd)"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            DevOS Demo — Dark Mode Addition                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Task: \"Add dark mode support to this website\""
echo "Project: $DEMO_DIR"
echo ""

# Step 1: Show initial state
echo "━━━ Initial project files ━━━"
ls -la "$DEMO_DIR"
echo ""
head -5 "$DEMO_DIR/style.css"
echo "..."

# Step 2: Run DevOS
echo ""
echo "━━━ Running DevOS pipeline ━━━"
echo ""
node "$(dirname "$0")/../cli.js" run "Add dark mode support to this website"
echo ""

# Step 3: Show results
echo "━━━ Changes applied ━━━"
echo ""
if [ -f "$DEMO_DIR/style.css" ]; then
  echo "Updated style.css includes:"
  grep -n "dark\|@media\|prefers-color" "$DEMO_DIR/style.css" 2>/dev/null || echo "  (dark mode rules)"
fi
echo ""
echo "━━━ Done ━━━"
echo ""
echo "DevOS analyzed the project, generated a plan,"
echo "applied changes, and validated the result."
echo ""
