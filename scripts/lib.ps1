$DEVOS_ROOT = Resolve-Path "$PSScriptRoot\.."
$CONFIG_PATH = "$DEVOS_ROOT\config\devos.json"

if (Test-Path $CONFIG_PATH) {
    $Config = Get-Content $CONFIG_PATH | ConvertFrom-Json
} else {
    Write-Host "[DEVOS][WARN] Config missing - using fallback"
    $Config = @{
        root = "$DEVOS_ROOT"
        workspace = $HOME
        ai = "opencode"
        version = "0.0.0"
    } | ConvertTo-Json | ConvertFrom-Json
}

$env:DEVOS_ROOT = $Config.root
$env:DEVOS_WORKSPACE = $Config.workspace
$env:DEVOS_AI = $Config.ai

Write-Host "[DEVOS] Loaded config v$($Config.version)"
