. C:\DevOs\scripts\lib.ps1

Write-Host "[DEVOS] Applying PR..."

if (!(Test-Path "C:\DevOs\logs\pr.json")) {
    Write-Host "[DEVOS] No PR found"
    exit 1
}

# BACKUP FULL REPO
Copy-Item $env:DEVOS_ROOT "$env:DEVOS_ROOT\backup\pre_pr" -Recurse -Force

foreach ($file in $pr.files) {

    $fullPath = Join-Path $env:DEVOS_ROOT $file.path

    if ($file.type -eq "modify") {
        Set-Content $fullPath $file.diff
    }

    if ($file.type -eq "delete") {
        Remove-Item $fullPath
    }
}

Write-Host "[DEVOS] PR merged successfully"