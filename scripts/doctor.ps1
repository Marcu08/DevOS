. C:\DevOs\scripts\lib.ps1

Write-Host "DEVOS DOCTOR"
Write-Host "============"

Write-Host "Git:"
git --version

Write-Host "Node:"
node --version

Write-Host "NPM:"
npm --version

Write-Host "PowerShell:"
$PSVersionTable.PSVersion

Write-Host "Starship:"
starship --version

Write-Host "Zoxide:"
zoxide --version

Write-Host "FZF:"
fzf --version
