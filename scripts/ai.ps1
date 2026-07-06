. $PSScriptRoot\lib.ps1
$ErrorActionPreference = "Stop"

Write-Host "[DEVOS] Profile loaded"
Write-Host "[AI v0.6] Starting full loop..."

try {
    & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\context.ps1"
} catch {
    Write-Host "[WARN] Context generation failed: $_"
}

try {
    & node "$env:DEVOS_ROOT\agent\agent.js" "improve current project"
} catch {
    Write-Host "[WARN] Agent execution failed: $_"
}

try {
    $promptFile = "$env:DEVOS_ROOT\logs\prompt.txt"
    if (Test-Path $promptFile) {
        $env:DEVOS_AI_PROMPT = (Get-Content $promptFile -Raw)
        Start-Process powershell -ArgumentList @(
          "-Command",
          "opencode < '$promptFile'"
        )
    } else {
        Write-Host "[WARN] No prompt.txt found at $promptFile"
    }
} catch {
    Write-Host "[WARN] opencode launch failed: $_"
}

Write-Host "[AI v0.6] Loop completed"
