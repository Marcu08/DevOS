. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

Write-Host "DEVOS DOCTOR"
Write-Host "============"

$tools = @(
    @{Name="Git"; Cmd="git --version"},
    @{Name="Node"; Cmd="node --version"},
    @{Name="NPM"; Cmd="npm --version"},
    @{Name="PowerShell"; Cmd="$($PSVersionTable.PSVersion)"},
    @{Name="Starship"; Cmd="starship --version"},
    @{Name="Zoxide"; Cmd="zoxide --version"},
    @{Name="FZF"; Cmd="fzf --version"}
)

foreach ($t in $tools) {
    try {
        $out = Invoke-Expression $t.Cmd 2>$null
        $status = $LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null
        if ($status) {
            Write-Host ("[OK] " + $t.Name + ": " + ($out -join ' '))
        } else {
            Write-Host ("[FAIL] " + $t.Name + ": exit code " + $LASTEXITCODE)
        }
    } catch {
        Write-Host ("[FAIL] " + $t.Name + ": " + $_.Exception.Message)
    }
}
