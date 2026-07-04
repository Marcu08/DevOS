. $PSScriptRoot\lib.ps1
Write-Host "[DEVOS] Profile loaded"
Write-Host "[AI v0.6] Starting full loop..."

powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\context.ps1"

node "$env:DEVOS_ROOT\agent\agent.js" "improve current project"

Start-Process powershell -ArgumentList @(
  "-Command",
  "opencode < $env:DEVOS_ROOT\logs\prompt.txt"
)

Write-Host "[AI v0.6] Loop completed"

