. C:\DevOs\scripts\lib.ps1

Write-Host "Checking PATH..."

$tools = @("git","node","npm","wezterm","starship","fzf","zoxide")

foreach ($t in $tools) {
    if (Get-Command $t -ErrorAction SilentlyContinue) {
        Write-Host "✔ $t"
    } else {
        Write-Host "✖ $t missing"
    }
}