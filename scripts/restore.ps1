. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

$OutputEncoding = [Console]::OutputEncoding

Write-Host "DEVOS RESTORE"

$backupRoot = "$env:USERPROFILE\.devos\backups"
$latest = Get-ChildItem $backupRoot -Directory -Filter "full_*" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $latest) {
    Write-Host "[ERROR] No backups found in $backupRoot"
    Write-Host "Run scripts\backup.ps1 first."
    exit 1
}

Write-Host "[INFO] Using backup: $($latest.FullName)"

$weztermBackup = Join-Path $latest.FullName "wezterm.lua"
$profileBackup = Join-Path $latest.FullName "profile.ps1"

if (Test-Path $weztermBackup) {
    Copy-Item $weztermBackup "$env:USERPROFILE\.wezterm.lua" -Force
    Write-Host "[OK] Restored WezTerm config"
} else {
    Write-Host "[WARN] wezterm.lua not found in backup"
}

if ($profileBackup -and (Test-Path $profileBackup)) {
    if (-not $PROFILE) {
        Write-Host "[WARN] No PowerShell profile path available"
    } else {
        New-Item -ItemType Directory -Force -Path (Split-Path $PROFILE) | Out-Null
        Copy-Item $profileBackup $PROFILE -Force
        Write-Host "[OK] Restored PowerShell profile"
    }
} else {
    Write-Host "[WARN] profile.ps1 not found in backup"
}

Write-Host "[OK] Restore completed"
