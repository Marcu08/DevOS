. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

Write-Host "[DEVOS] Applying PR..."

$prPath = "$env:DEVOS_ROOT\logs\pr.json"

if (!(Test-Path $prPath)) {
    Write-Host "[DEVOS] No PR found at $prPath"
    exit 1
}

try {
    $pr = Get-Content $prPath | ConvertFrom-Json
} catch {
    Write-Host "[DEVOS] Failed to parse pr.json: $_"
    exit 1
}

# Safe backup outside DEVOS_ROOT to prevent recursive copy
$backupRoot = "$env:USERPROFILE\.devos\backups\pre_pr_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

foreach ($file in $pr.files) {
    $fullPath = Join-Path $env:DEVOS_ROOT $file.path

    try {
        # Backup the specific file before modifying
        $relPath = $file.path -replace '^\.?\\?', ''
        $backupFile = Join-Path $backupRoot $relPath
        $backupDir = Split-Path $backupFile -Parent
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        if (Test-Path $fullPath) {
            Copy-Item $fullPath $backupFile -Force
        }

        if ($file.type -eq "modify") {
            $destDir = Split-Path $fullPath -Parent
            New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            Set-Content $fullPath $file.diff
            Write-Host "[DEVOS] Modified $($file.path)"
        } elseif ($file.type -eq "delete") {
            if (Test-Path $fullPath) {
                Remove-Item $fullPath -Force
                Write-Host "[DEVOS] Deleted $($file.path)"
            }
        }
    } catch {
        Write-Host "[DEVOS] Error processing $($file.path): $_"
        exit 1
    }
}

Write-Host "[DEVOS] PR merged successfully (backup: $backupRoot)"
