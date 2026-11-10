param(
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Rebuilding and validating..." -ForegroundColor Cyan
node scripts/build-all.mjs
if ($LASTEXITCODE -ne 0) { throw "Build or validation failed. Nothing was committed." }

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "Nothing to publish." -ForegroundColor Yellow
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = "content: publish $(Get-Date -Format 'yyyy-MM-dd')"
}

git commit -m $Message
if ($LASTEXITCODE -ne 0) { throw "Commit failed." }

git push
if ($LASTEXITCODE -ne 0) {
  Write-Host "Commit saved locally, but push failed. Check your GitHub credentials." -ForegroundColor Yellow
  exit 1
}

Write-Host "Published. GitHub Pages will rebuild in about a minute." -ForegroundColor Green
