. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

Write-Host "[CTX] Building full context..."

$repo = Get-Location

try {
    $files = Get-ChildItem -Recurse -File |
    Where-Object {
        $_.FullName -notmatch "node_modules|\.git|bin|obj|backup"
    } |
    Select-Object FullName
} catch {
    Write-Host "[CTX] Warning: file scan failed: $_"
    $files = @()
}

try {
    $git = git status 2>$null
} catch {
    $git = "N/A (not a git repo)"
}

try {
    $diff = git diff 2>$null
} catch {
    $diff = ""
}

$data = @{
    repo = $repo.Path
    files = $files.FullName
    git = $git
    diff = $diff
    time = Get-Date
}

$outputPath = "$env:DEVOS_ROOT\logs\context.json"
$data | ConvertTo-Json -Depth 5 | Out-File $outputPath

Write-Host "[CTX] Context written to $outputPath"
