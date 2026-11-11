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

# Lessons touched in the working tree that are not committed yet.
function Get-PendingLessons {
  $tracked = git diff --name-only HEAD -- days
  $untracked = git ls-files --others --exclude-standard -- days
  @($tracked) + @($untracked) |
    Where-Object { $_ -match '^days/day-\d{3}\.md$' } |
    Sort-Object -Unique
}

# Rough token estimate for salvaged lessons, so the budget is not blind tomorrow.
function Add-RunLogEntry([string[]]$Files, [string]$Note) {
  if (-not $Files -or $Files.Count -eq 0) { return }
  $words = 0
  foreach ($f in $Files) {
    if (Test-Path $f) {
      $words += (Get-Content $f -Raw) -split '\s+' | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
    }
  }
  $days = $Files | ForEach-Object { [int]($_.Substring(9, 3)) }
  $est = [int]([Math]::Round($words * 1.4 + 1500))
  $entry = [ordered]@{
    date    = (Get-Date -Format 'yyyy-MM-dd')
    lessons = @($days)
    estTokens = $est
    model   = "salvaged"
    note    = $Note
  } | ConvertTo-Json -Compress
  Add-Content -Path (Join-Path $repo "ops\run-log.jsonl") -Value $entry -Encoding utf8
  Write-Log "Logged salvaged run: days $($days -join ', '), ~$est tokens."
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

  Write-Log (("Running {0} lesson(s) with {1}" -f $count, $opencode))
  if ($DryRun) {
    Write-Log "Dry run: stopping before the model call."
    exit 0
  }

  # Capture the model's output so a failure is diagnosable from the log alone.
  $output = & $opencode @cliArgs 2>&1 | ForEach-Object { $line = "$_"; Write-Host $line; $line }
  $modelExit = $LASTEXITCODE
  $text = ($output | Out-String)
  if ($text.Trim()) {
    Add-Content -Path $logPath -Value $text.TrimEnd() -Encoding utf8
  }

  $pending = @(Get-PendingLessons)

  if ($modelExit -ne 0) {
    if ($text -match 'usage limit|quota|rate limit|limit reached') {
      Write-Log "Daily model quota is exhausted. Salvaging lessons that were already written."
    } else {
      Write-Log "ERROR: opencode run failed with exit code $modelExit."
    }
    if ($pending.Count -eq 0) {
      Write-Log "No lesson files were written. Nothing to publish."
      exit 0
    }
  }

  node scripts/build-all.mjs
  if ($LASTEXITCODE -ne 0) { throw "Validation failed after the run. Nothing was published." }

  # Only publish lessons the checker accepts.
  $complete = @()
  foreach ($f in $pending) {
    if ((Get-Content $f -Raw) -match '(?m)^status:\s*complete\s*$') { $complete += $f }
  }

  git add -A
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Log "No changes to publish."
    exit 0
  }

  if ($modelExit -ne 0) {
    $message = "lesson: automated run $(Get-Date -Format 'yyyy-MM-dd') (partial)"
    git commit -m $message
    if ($LASTEXITCODE -ne 0) { throw "git commit failed." }
    Add-RunLogEntry $complete "Model stopped early; complete lessons were kept and drafts were left for the next run."
    git add -A
    git commit -m "chore(run-log): record the partial automated run" | Out-Null
  } else {
    $message = "lesson: automated run $(Get-Date -Format 'yyyy-MM-dd')"
    git commit -m $message
    if ($LASTEXITCODE -ne 0) { throw "git commit failed." }
  }

  if ($config.push -eq $false) {
    Write-Log "Commit created; push is disabled in ops/automation.json."
    exit 0
  }

  git push
  if ($LASTEXITCODE -ne 0) { throw "git push failed. Check GitHub credentials for the scheduled task." }

  Write-Log "Published. GitHub Pages will rebuild shortly."
  exit 0
}
catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
}
