param(
    [string]$TaskName = "TommyTools Property Collector",
    [string]$DailyTime = "04:45"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $root "run_scheduled.ps1"
$python = Join-Path $root ".venv\Scripts\python.exe"
$envFile = Join-Path $root ".env"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)) {
    throw "Open PowerShell as Administrator, then run this installer again."
}

if (-not (Test-Path $runner)) {
    throw "Missing $runner"
}
if (-not (Test-Path $python)) {
    throw "Virtual environment not found. Create it first with: py -3.13 -m venv .venv"
}
if (-not (Test-Path $envFile)) {
    throw ".env is missing. Copy .env.example to .env and configure it first."
}

$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "The task will run as $userId, including when you are logged out."
Write-Host "Enter the Windows account password, not the Windows Hello PIN."
$credential = Get-Credential -UserName $userId -Message "Credentials for $TaskName"
$password = $credential.GetNetworkCredential().Password
if ([string]::IsNullOrWhiteSpace($password)) {
    throw "A Windows account password is required for unattended network access."
}

$action = New-ScheduledTaskAction `
    -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $runner) `
    -WorkingDirectory $root

$dailyTrigger = New-ScheduledTaskTrigger -Daily -At $DailyTime
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$startupTrigger.Delay = "PT5M"

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -WakeToRun `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 30) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

$description = @"
Runs the TommyTools four-county property collector daily and five minutes after Windows starts.
Missed daily runs start when the machine next becomes available. The wrapper skips duplicate runs,
uses a deeper catch-up scan after several offline days, and retries network failures.
"@

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger @($dailyTrigger, $startupTrigger) `
    -Settings $settings `
    -Description $description.Trim() `
    -User $userId `
    -Password $password `
    -RunLevel Limited `
    -Force | Out-Null

Write-Host ""
Write-Host "Installed scheduled task: $TaskName" -ForegroundColor Green
Write-Host "Daily trigger: $DailyTime"
Write-Host "Startup trigger: five minutes after Windows starts"
Write-Host "StartWhenAvailable: enabled"
Write-Host "Network retries: 3 attempts, 30 minutes apart"
Write-Host ""
Write-Host "Test it now with:"
Write-Host ('Start-ScheduledTask -TaskName "{0}"' -f $TaskName)
Write-Host "Review the log at:"
Write-Host (Join-Path $root "output\scheduled.log")
