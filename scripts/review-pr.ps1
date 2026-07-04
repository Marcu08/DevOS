. $PSScriptRoot\lib.ps1

$pr = Get-Content "$env:DEVOS_ROOT\logs\pr.json" | ConvertFrom-Json

Write-Host "=== DEVOS PR REVIEW ==="
Write-Host "Task: $($pr.task)"
Write-Host "Summary: $($pr.summary)"
Write-Host "Risk: $($pr.risk)"
Write-Host ""

foreach ($file in $pr.files) {
    Write-Host "FILE: $($file.path)"
    Write-Host "TYPE: $($file.type)"
    Write-Host "DIFF:"
    Write-Host $file.diff
    Write-Host "----------------------"
}

$choice = Read-Host "Merge PR? (y/n)"

if ($choice -eq "y") {
    powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\apply-pr.ps1"
}