. $PSScriptRoot\lib.ps1

Write-Host "[DEVOS] Applying patch..."

$patch = Get-Content "$env:DEVOS_ROOT\logs\patch.json" | ConvertFrom-Json

Copy-Item $env:DEVOS_ROOT "$env:DEVOS_ROOT\backup\pre_patch" -Recurse -Force

foreach ($change in $patch.changes) {

    $file = Join-Path $env:DEVOS_ROOT $change.file

    if ($change.type -eq "edit") {
        Set-Content $file $change.content
    }

    if ($change.type -eq "delete") {
        Remove-Item $file
    }
}

Write-Host "[DEVOS] Patch applied safely"