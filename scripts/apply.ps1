. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

Write-Host "[DEVOS] Applying patch..."

$patchPath = "$env:DEVOS_ROOT\logs\patch.json"
if (!(Test-Path $patchPath)) {
    Write-Host "[DEVOS] No patch found at $patchPath"
    exit 1
}

try {
    $patch = Get-Content $patchPath | ConvertFrom-Json
} catch {
    Write-Host "[DEVOS] Failed to parse patch.json: $_"
    exit 1
}

# Safe backup outside DEVOS_ROOT to prevent recursive copy
$backupRoot = "$env:USERPROFILE\.devos\backups\pre_patch_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

foreach ($change in $patch.changes) {
    $file = Join-Path $env:DEVOS_ROOT $change.file

    try {
        # Backup the specific file before modifying
        $relPath = $change.file -replace '^\.?\\?', ''
        $backupFile = Join-Path $backupRoot $relPath
        $backupDir = Split-Path $backupFile -Parent
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        if (Test-Path $file) {
            Copy-Item $file $backupFile -Force
        }

        if ($change.type -eq "edit") {
            $destDir = Split-Path $file -Parent
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            Set-Content $file $change.content
            Write-Host "[DEVOS] Edited $($change.file)"
        } elseif ($change.type -eq "delete") {
            if (Test-Path $file) {
                Remove-Item $file -Force
                Write-Host "[DEVOS] Deleted $($change.file)"
            }
        }
    } catch {
        Write-Host "[DEVOS] Error processing $($change.file): $_"
        exit 1
    }
}

Write-Host "[DEVOS] Patch applied safely (backup: $backupRoot)"
