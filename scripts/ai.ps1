Write-Host "[AI v0.6] Starting full loop..."

powershell -ExecutionPolicy Bypass -File C:\DevOs\scripts\context.ps1

node C:\DevOs\agent\agent.js "improve current project"

Start-Process powershell -ArgumentList @(
  "-Command",
  "opencode < C:\DevOs\logs\prompt.txt"
)

Write-Host "[AI v0.6] Loop completed"