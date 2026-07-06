. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

$prPath = "$env:DEVOS_ROOT\logs\pr.json"
if (!(Test-Path $prPath)) {
    Write-Host "[ERROR] No PR found at $prPath"
    exit 1
}

try {
    $pr = Get-Content $prPath | ConvertFrom-Json
} catch {
    Write-Host "[ERROR] Failed to parse pr.json: $_"
    exit 1
}

Write-Host "=== DEVOS PR REVIEW ==="
Write-Host "Task: $($pr.task)"
Write-Host "Summary: $($pr.summary)"
Write-Host "Risk: $($pr.risk)"
Write-Host ""

foreach ($file in $pr.files) {
    Write-Host "FILE: $($file.path)"
    Write-Host "TYPE: $($file.type)"
    if ($file.diff) {
        Write-Host "DIFF:"
        Write-Host $file.diff
    }
    Write-Host "----------------------"
}

$choice = Read-Host "Merge PR? (y/n)"

if ($choice -eq "y") {
    try {
        & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\apply-pr.ps1"
    } catch {
        Write-Host "[ERROR] Apply-PR failed: $_"
        exit 1
    }
} else {
    Write-Host "[DEVOS] PR merge cancelled"
}
