. $PSScriptRoot\lib.ps1

Write-Host "================================"
Write-Host "        DEVOS INSTALLER"
Write-Host "================================"

function Install($name, $cmd) {
    Write-Host ""
    Write-Host "→ Installing $name"
    try {
        Invoke-Expression $cmd
        Write-Host "✔ $name done"
    } catch {
        Write-Host "✖ failed: $name"
    }
}

# =========================
# CORE TOOLS
# =========================

Install "Git" "winget install --id Git.Git -e"
Install "Node.js" "winget install OpenJS.NodeJS"
Install "WezTerm" "winget install wez.wezterm"
Install "Starship" "winget install Starship.Starship"
Install "zoxide" "winget install ajeetdsouza.zoxide"
Install "fzf" "winget install junegunn.fzf"

Write-Host ""
Write-Host "================================"
Write-Host " INSTALL COMPLETED"
Write-Host "================================"