. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

Write-Host "================================"
Write-Host "        DEVOS INSTALLER"
Write-Host "================================"

function Install($name, $cmd) {
    Write-Host ""
    Write-Host "→ Installing $name"
    try {
        $output = Invoke-Expression $cmd 2>&1
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            Write-Host "✖ $name failed (exit code: $LASTEXITCODE)"
        } else {
            Write-Host "✔ $name done"
        }
    } catch {
        Write-Host "✖ $name failed: $_"
    }
}

Install "Git" "winget install --id Git.Git -e 2>&1"
Install "Node.js" "winget install OpenJS.NodeJS 2>&1"
Install "WezTerm" "winget install wez.wezterm 2>&1"
Install "Starship" "winget install Starship.Starship 2>&1"
Install "zoxide" "winget install ajeetdsouza.zoxide 2>&1"
Install "fzf" "winget install junegunn.fzf 2>&1"

Write-Host ""
Write-Host "================================"
Write-Host " INSTALL COMPLETED"
Write-Host "================================"
