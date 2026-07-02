Write-Host "[CTX] Building project context..."

$files = Get-ChildItem -Recurse -File |
    Where-Object { $_.FullName -notmatch "node_modules|\.git" } |
    Select-Object -First 30 FullName

$output = @{
    path = (Get-Location).Path
    files = $files
    time = Get-Date
}

$output | ConvertTo-Json -Depth 3 | Out-File "context.json"

Write-Host "[CTX] Context saved"