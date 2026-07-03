. C:\DevOs\scripts\lib.ps1

$OutputEncoding = [Console]::OutputEncoding

Write-Host "DEVOS BACKUP START"

$backupDir = "$PSScriptRoot\..\backup"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

# WezTerm
Copy-Item "$env:USERPROFILE\.wezterm.lua" "$backupDir\wezterm.lua" -Force

# PowerShell profile
Copy-Item $PROFILE "$backupDir\profile.ps1" -Force

Write-Host "[OK] Backup completed"