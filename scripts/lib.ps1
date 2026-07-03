$CONFIG_PATH = "C:\DevOs\config\devos.json"

if (!(Test-Path $CONFIG_PATH)) {
    Write-Host "[DEVOS][WARN] Config missing - using fallback"
    $Config = @{
        root = "C:\DevOs"
        workspace = $HOME
        ai = "opencode"
        version = "0.6.3"
    } | ConvertTo-Json | ConvertFrom-Json
}

$Config = Get-Content $CONFIG_PATH | ConvertFrom-Json

$env:DEVOS_ROOT = $Config.root
$env:DEVOS_WORKSPACE = $Config.workspace
$env:DEVOS_AI = $Config.ai

Write-Host "[DEVOS] Loaded config v$($Config.version)"