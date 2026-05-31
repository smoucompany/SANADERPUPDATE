param(
  [Parameter(Mandatory=$true)] [string]$Version,
  [string]$Notes = ""
)

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

Write-Host "Updating to version: $Version" -ForegroundColor Cyan

# 1. Update public/latest.json
$manifestPath = Join-Path $ProjectDir "public\latest.json"
$features = @()
$manifest = [ordered]@{
  version     = $Version
  notes       = if ($Notes) { $Notes } else { "Update to version $Version" }
  released_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.000Z")
  url         = ""
  filename    = "erp-update-v$Version.zip"
  features    = $features
}
$json = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($manifestPath, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host "OK  public/latest.json updated to v$Version" -ForegroundColor Green

# 2. Build
Write-Host "Building..." -ForegroundColor Yellow
Set-Location $ProjectDir
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed" -ForegroundColor Red; exit 1 }
Write-Host "OK  Build successful" -ForegroundColor Green

# 3. Deploy
Write-Host "Deploying to Vercel..." -ForegroundColor Yellow
& vercel deploy --prod

Write-Host ""
Write-Host "Published: v$Version -> https://sanaderp.vercel.app" -ForegroundColor Green
Write-Host "Users will see update notification within 30 minutes." -ForegroundColor White