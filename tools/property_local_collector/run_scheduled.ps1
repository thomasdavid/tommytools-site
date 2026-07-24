param(
    [switch]$Force,
    [int]$DueAfterHours = 20
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$outputDir = Join-Path $root "output"
$statePath = Join-Path $outputDir "scheduler_state.json"
$lockPath = Join-Path $outputDir "scheduler.lock"
$logPath = Join-Path $outputDir "scheduled.log"
$python = Join-Path $root ".venv\Scripts\python.exe"
$envFile = Join-Path $root ".env"

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

function Write-Log {
    param([string]$Message)
    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    $line | Tee-Object -FilePath $logPath -Append
}

$lock = $null
try {
    try {
        $lock = [System.IO.File]::Open(
            $lockPath,
            [System.IO.FileMode]::OpenOrCreate,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None
        )
    }
    catch {
        Write-Log "Another collector run is already active; exiting."
        exit 0
    }

    if (-not (Test-Path $python)) {
        throw "Virtual environment not found at $python. Run: py -3.13 -m venv .venv"
    }
    if (-not (Test-Path $envFile)) {
        throw ".env is missing. Copy .env.example to .env and add the receiver URL and token."
    }

    $state = $null
    if (Test-Path $statePath) {
        try {
            $state = Get-Content $statePath -Raw | ConvertFrom-Json
        }
        catch {
            Write-Log "Could not parse scheduler_state.json; treating this as an overdue run."
        }
    }

    $lastSuccess = $null
    if ($state -and $state.last_success_utc) {
        try {
            $lastSuccess = [DateTimeOffset]::Parse($state.last_success_utc)
        }
        catch { }
    }

    $now = [DateTimeOffset]::UtcNow
    $hoursSinceSuccess = if ($lastSuccess) {
        ($now - $lastSuccess).TotalHours
    }
    else {
        [double]::PositiveInfinity
    }

    if (-not $Force -and $hoursSinceSuccess -lt $DueAfterHours) {
        Write-Log ("Last successful run was {0:N1} hours ago; nothing is due." -f $hoursSinceSuccess)
        exit 0
    }

    if (-not (Test-NetConnection "www.daft.ie" -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
        throw "Internet connectivity check failed. Task Scheduler will retry later."
    }

    $maxPages = if ([double]::IsPositiveInfinity($hoursSinceSuccess) -or $hoursSinceSuccess -ge 168) {
        10
    }
    elseif ($hoursSinceSuccess -ge 72) {
        5
    }
    else {
        2
    }

    Write-Log ("Starting incremental collection; hours since success={0:N1}, max pages per county={1}." -f $hoursSinceSuccess, $maxPages)

    $arguments = @(
        "collector.py",
        "--mode", "incremental",
        "--counties", "dublin,carlow,kildare,wicklow",
        "--max-pages", "$maxPages"
    )

    $collectorOutput = & $python @arguments 2>&1
    $exitCode = $LASTEXITCODE
    $collectorOutput | ForEach-Object { Write-Log ([string]$_) }

    if ($exitCode -ne 0) {
        throw "Collector exited with code $exitCode."
    }

    $newState = [ordered]@{
        last_success_utc = [DateTimeOffset]::UtcNow.ToString("o")
        last_success_local = (Get-Date).ToString("o")
        max_pages = $maxPages
        status = "success"
    }
    $newState | ConvertTo-Json | Set-Content -Path $statePath -Encoding UTF8
    Write-Log "Collector completed successfully."
    exit 0
}
catch {
    $failureState = [ordered]@{
        last_attempt_utc = [DateTimeOffset]::UtcNow.ToString("o")
        last_attempt_local = (Get-Date).ToString("o")
        status = "failed"
        error = $_.Exception.Message
    }
    $failureState | ConvertTo-Json | Set-Content -Path (Join-Path $outputDir "scheduler_last_failure.json") -Encoding UTF8
    Write-Log ("FAILED: " + $_.Exception.Message)
    exit 1
}
finally {
    if ($lock) {
        $lock.Dispose()
    }
}
