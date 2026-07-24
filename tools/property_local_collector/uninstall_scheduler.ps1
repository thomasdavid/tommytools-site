param(
    [string]$TaskName = "TommyTools Property Collector"
)

$ErrorActionPreference = "Stop"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
Write-Host "Removed scheduled task: $TaskName" -ForegroundColor Green
