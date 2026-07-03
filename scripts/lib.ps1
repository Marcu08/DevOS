$Config = Get-Content "C:\DevOs\config\devos.json" | ConvertFrom-Json

$env:DEVOS_ROOT = $Config.root
$env:DEVOS_AI = $Config.ai
$env:DEVOS_EDITOR = $Config.editor