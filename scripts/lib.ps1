$ErrorActionPreference = "Stop"

$DEVOS_ROOT = Resolve-Path "$PSScriptRoot\.."
$CONFIG_PATH = "$DEVOS_ROOT\config\devos.json"

if (Test-Path $CONFIG_PATH) {
    try {
        $Config = Get-Content $CONFIG_PATH | ConvertFrom-Json
    } catch {
        Write-Host "[DEVOS][WARN] Config parse error: $_"
        $Config = $null
    }
}

if (-not $Config) {
    Write-Host "[DEVOS][WARN] Config missing — using fallback"
    $Config = @{
        root = "$DEVOS_ROOT"
        workspace = $HOME
        ai = "opencode"
        version = "0.0.0"
    }
}

$env:DEVOS_ROOT = $Config.root
$env:DEVOS_WORKSPACE = $Config.workspace
$env:DEVOS_AI = if ($Config.ai -is [string]) { $Config.ai } else { $Config.ai.provider }

Write-Host "[DEVOS] Loaded config v$($Config.version)"
