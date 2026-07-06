$ErrorActionPreference = "Stop"

Write-Host "DEVOS RESTORE"

$backupDir = "$env:USERPROFILE\.devos\backups"
$backups = Get-ChildItem -Path $backupDir -Directory | Sort-Object LastWriteTime -Descending

if (-not $backups) {
    Write-Host "[ERROR] No backups found in $backupDir"
    exit 1
}

$latest = $backups[0].FullName
Write-Host "Restoring from: $latest"

try {
    $wezterm = Join-Path $latest "wezterm.lua"
    if (Test-Path $wezterm) {
        Copy-Item $wezterm "$env:USERPROFILE\.wezterm.lua" -Force
        Write-Host "[OK] Restored WezTerm config"
    }
} catch {
    Write-Host "[WARN] WezTerm restore failed: $_"
}

try {
    $profileFile = Join-Path $latest "profile.ps1"
    if ($PROFILE -and (Test-Path $profileFile)) {
        Copy-Item $profileFile $PROFILE -Force
        Write-Host "[OK] Restored PowerShell profile"
    }
} catch {
    Write-Host "[WARN] Profile restore failed: $_"
}

Write-Host "[OK] Restore completed"
