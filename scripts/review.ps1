. $PSScriptRoot\lib.ps1

Write-Host "=== DEVOS REVIEW ==="

$patch = Get-Content "$env:DEVOS_ROOT\logs\patch.json" | ConvertFrom-Json

foreach ($change in $patch.changes) {
    Write-Host ""
    Write-Host "FILE: $($change.file)"
    Write-Host "TYPE: $($change.type)"
    Write-Host "DIFF:"
    Write-Host $change.diff
}

$confirm = Read-Host "Apply changes? (y/n)"

if ($confirm -eq "y") {
    powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\apply.ps1"
}