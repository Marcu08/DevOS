Write-Host "[REVIEW] DevOS Proposal Viewer"

if (Test-Path "C:\DevOs\logs\proposal.json") {
    Get-Content "C:\DevOs\logs\proposal.json"
} else {
    Write-Host "[REVIEW] No proposal found"
}