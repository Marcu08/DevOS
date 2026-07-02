Write-Host "[AI] Starting DevOS AI layer..."

$task = "improve current project"
$cwd = Get-Location

Start-Process powershell -ArgumentList @(
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "node C:\Users\marzu\DevOs\agent\agent.js `"$task`" `"$cwd`""
)

Write-Host "[AI] Agent launched"
exit