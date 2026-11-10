param(
  [string]$Time = "09:00",
  [string]$TaskName = "English120 Daily Lesson"
)

# Registers a Windows Scheduled Task that runs scripts/daily.ps1 once a day.
# The task runs as you, in your user session, with a hidden window.
# It needs this PC to be switched on and you to be logged in.

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$daily = Join-Path $PSScriptRoot "daily.ps1"

if (-not (Test-Path $daily)) { throw "Cannot find $daily" }

# Prefer PowerShell 7, but only when it resolves to a real file. The Store
# version of pwsh is a zero-byte app execution alias, and Task Scheduler
# cannot launch those. Fall back to Windows PowerShell 5.1, which is a
# stable real path and handles scripts/daily.ps1 fine.
$shell = $null
$pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
if ($pwsh -and (Test-Path $pwsh)) {
  $item = Get-Item $pwsh
  if ($item.Length -gt 0) { $shell = $pwsh }
}
if (-not $shell) {
  $shell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
}
if (-not (Test-Path $shell)) { throw "Cannot find a usable PowerShell host." }

$action = New-ScheduledTaskAction `
  -Execute $shell `
  -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$daily`"" `
  -WorkingDirectory $repo

$trigger = New-ScheduledTaskTrigger -Daily -At $Time

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 45) `
  -MultipleInstances IgnoreNew

$description = "Writes the next English 120 lesson(s) within the daily token budget, validates, and publishes to GitHub."

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description $description `
  -Force | Out-Null

Write-Host ""
Write-Host "Scheduled task registered." -ForegroundColor Green
Write-Host "  Name:     $TaskName"
Write-Host "  Time:     $Time (local time, every day)"
Write-Host "  Runs:     $daily"
Write-Host "  Log:      $repo\ops\automation.log"
Write-Host ""
Write-Host "Test it now:  Start-ScheduledTask -TaskName `"$TaskName`""
Write-Host "Check it:     Get-ScheduledTaskInfo -TaskName `"$TaskName`""
Write-Host "Remove it:    Unregister-ScheduledTask -TaskName `"$TaskName`" -Confirm:`$false"
