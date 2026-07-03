. C:\DevOs\scripts\lib.ps1

Write-Host "[CTX] Building full context..."

$repo = Get-Location

$files = Get-ChildItem -Recurse -File |
Where-Object {
    $_.FullName -notmatch "node_modules|\.git|bin|obj"
} |
Select-Object FullName

$git = git status
$diff = git diff

$data = @{
    repo = $repo.Path
    files = $files.FullName
    git = $git
    diff = $diff
    time = Get-Date
}

$data | ConvertTo-Json -Depth 5 | Out-File "context.json"

Write-Host "[CTX] Context ready"