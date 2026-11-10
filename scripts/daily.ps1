param(
  [int]$Lessons = 0,
  [switch]$DryRun
)

# Writes the next lesson(s) within today's token budget, validates, commits and pushes.
# Designed to run unattended from Windows Task Scheduler.
# Usage:
#   .\scripts\daily.ps1                # use the budget's recommendation
#   .\scripts\daily.ps1 -Lessons 1     # cap this run at one lesson
#   .\scripts\daily.ps1 -DryRun        # show what would happen, call no model

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$logPath = Join-Path $repo "ops\automation.log"
function Write-Log([string]$Message) {
  $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -Path $logPath -Value $line -Encoding utf8
}

try {
  $configPath = Join-Path $repo "ops\automation.json"
  $config = if (Test-Path $configPath) {
    Get-Content $configPath -Raw | ConvertFrom-Json
  } else {
    [pscustomobject]@{}
  }

  if ($config.PSObject.Properties.Name -contains "enabled" -and -not $config.enabled) {
    Write-Log "Automation disabled in ops/automation.json. Exiting."
    exit 0
  }

  $budget = node scripts/budget.mjs --json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "scripts/budget.mjs failed." }

  Write-Log ("Budget: {0} usable, {1} used, {2} remaining, recommendation {3}." -f `
      $budget.usableToday, $budget.usedToday, $budget.remaining, $budget.recommendedLessons)

  $requested = 0
  if ($Lessons -gt 0) { $requested = $Lessons }
  elseif ($config.maxLessonsPerRun -and [int]$config.maxLessonsPerRun -gt 0) { $requested = [int]$config.maxLessonsPerRun }
  else { $requested = [int]$budget.recommendedLessons }

  $count = [Math]::Min($requested, [int]$budget.recommendedLessons)
  if ($count -le 0) {
    Write-Log "No lesson fits in today's remaining budget. Nothing to do."
    exit 0
  }

  $opencode = (Get-Command opencode.cmd -ErrorAction SilentlyContinue).Source
  if (-not $opencode) { $opencode = (Get-Command opencode -ErrorAction Stop).Source }

  $prompt = "Write $count lesson(s), following the budget and quality rules. Commit each lesson, but do not push; the scheduler publishes."
  $cliArgs = @("run", "--agent", "lesson-writer")
  if ($config.model) { $cliArgs += @("--model", [string]$config.model) }
  $cliArgs += $prompt

  Write-Log ("Running {0} lesson(s) with {1}" -f $count, $opencode)
  if ($DryRun) {
    Write-Log "Dry run: stopping before the model call."
    exit 0
  }

  & $opencode @cliArgs
  if ($LASTEXITCODE -ne 0) { throw "opencode run failed with exit code $LASTEXITCODE." }

  node scripts/build-all.mjs
  if ($LASTEXITCODE -ne 0) { throw "Validation failed after the run. Nothing was published." }

  git add -A
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Log "No changes to publish."
    exit 0
  }

  $message = "lesson: automated run $(Get-Date -Format 'yyyy-MM-dd')"
  git commit -m $message
  if ($LASTEXITCODE -ne 0) { throw "git commit failed." }

  if ($config.push -eq $false) {
    Write-Log "Commit created; push is disabled in ops/automation.json."
    exit 0
  }

  git push
  if ($LASTEXITCODE -ne 0) { throw "git push failed. Check GitHub credentials for the scheduled task." }

  Write-Log "Published. GitHub Pages will rebuild shortly."
}
catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
}
