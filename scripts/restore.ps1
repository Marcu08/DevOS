$OutputEncoding = [Console]::OutputEncoding

Write-Host "DEVOS RESTORE"

$backupDir = "$PSScriptRoot\..\backup"

Copy-Item "$backupDir\wezterm.lua" "$env:USERPROFILE\.wezterm.lua" -Force
Copy-Item "$backupDir\profile.ps1" $PROFILE -Force

Write-Host "[OK] Restore completed"