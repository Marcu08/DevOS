. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

$OutputEncoding = [Console]::OutputEncoding

Write-Host "DEVOS BACKUP START"

$backupDir = "$env:USERPROFILE\.devos\backups\full_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

try {
    if (Test-Path "$env:USERPROFILE\.wezterm.lua") {
        Copy-Item "$env:USERPROFILE\.wezterm.lua" "$backupDir\wezterm.lua" -Force
    }
} catch {
    Write-Host "[WARN] WezTerm backup failed: $_"
}

try {
    if ($PROFILE -and (Test-Path $PROFILE)) {
        Copy-Item $PROFILE "$backupDir\profile.ps1" -Force
    }
} catch {
    Write-Host "[WARN] Profile backup failed: $_"
}

Write-Host "[OK] Backup completed → $backupDir"
