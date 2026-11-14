# DevOS PowerShell Profile
# Place in $PROFILE.CurrentUserCurrentHost

# --- AI / Agent ---
function ai { opencode @args }
function dev-ai { node cli.js run }
function agent { node cli.js orchestrate @args }
function agent-run { node cli.js run @args }

# --- Navigation ---
function fzf-cd { Get-ChildItem -Directory -Recurse -Depth 3 | Out-String | fzf | Set-Location }
function ctrlp { Get-ChildItem -File -Recurse | Out-String | fzf | Set-Clipboard }
function zz { Set-Location (Get-ChildItem -Directory -Recurse -Depth 5 | Out-String | fzf) }

# --- Git ---
function gcommit { git add . && git commit -m "$args" }
function gp { git push }

# --- Project Info ---
function dev {
  Write-Host "`nLocation: $(Get-Location)" -ForegroundColor Cyan
  Write-Host "Branch: $(git branch --show-current)" -ForegroundColor Cyan
  Write-Host "Status:" -ForegroundColor Cyan
  git status --short
  Write-Host "Recent files:" -ForegroundColor Cyan
  Get-ChildItem -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5
}
function proj {
  Write-Host "Project: $(Split-Path -Leaf (Get-Location))" -ForegroundColor Cyan
  Write-Host "Branch: $(git branch --show-current)" -ForegroundColor Cyan
  git status --short | Measure-Object | ForEach-Object { Write-Host "$($_.Count) changes" -ForegroundColor Yellow }
}

# --- Shortcuts ---
function ll { Get-ChildItem -Force }
Set-Alias -Name c -Value Clear-Host
Set-Alias -Name .. -Value (Get-Command Set-Location).ScriptBlock
