. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

Write-Host "=== DEVOS REVIEW ==="

$patchPath = "$env:DEVOS_ROOT\logs\patch.json"
if (!(Test-Path $patchPath)) {
    Write-Host "[ERROR] No patch found at $patchPath"
    exit 1
}

try {
    $patch = Get-Content $patchPath | ConvertFrom-Json
} catch {
    Write-Host "[ERROR] Failed to parse patch.json: $_"
    exit 1
}

foreach ($change in $patch.changes) {
    Write-Host ""
    Write-Host "FILE: $($change.file)"
    Write-Host "TYPE: $($change.type)"
    if ($change.diff) {
        Write-Host "DIFF:"
        Write-Host $change.diff
    }
}

$confirm = Read-Host "Apply changes? (y/n)"

if ($confirm -eq "y") {
    try {
        & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\apply.ps1"
    } catch {
        Write-Host "[ERROR] Apply failed: $_"
        exit 1
    }
} else {
    Write-Host "[DEVOS] Review cancelled"
}
