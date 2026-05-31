# ═══════════════════════════════════════════════════════
#  make-release.ps1
#  يبني المشروع ويُنشئ ملف ZIP جاهز للرفع على موقع التحديثات
#  الاستخدام:  .\make-release.ps1  1.2.0  "وصف التحديث"
# ═══════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [string]$Notes = "تحديث النظام إلى الإصدار $Version"
)

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot
$DistDir    = Join-Path $ProjectDir "dist"
$ReleasesDir = Join-Path $ProjectDir "releases"

Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   نظام الإدارة المتكامل — بناء الإصدار   " -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── 1. تحديث رقم الإصدار في .env ──
Write-Host "► تحديث رقم الإصدار في .env ..." -ForegroundColor Yellow
$envPath = Join-Path $ProjectDir ".env"
$envContent = Get-Content $envPath -Raw -Encoding utf8
if ($envContent -match "VITE_APP_VERSION=.*") {
    $envContent = $envContent -replace "VITE_APP_VERSION=.*", "VITE_APP_VERSION=$Version"
} else {
    $envContent += "`nVITE_APP_VERSION=$Version"
}
[System.IO.File]::WriteAllText($envPath, $envContent, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ الإصدار: $Version" -ForegroundColor Green

# ── 2. البناء ──
Write-Host ""
Write-Host "► بناء المشروع (npm run build) ..." -ForegroundColor Yellow
Set-Location $ProjectDir
$buildResult = & npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ فشل البناء!" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}
Write-Host "  ✓ تم البناء بنجاح" -ForegroundColor Green

# ── 3. إنشاء مجلد الإصدارات ──
New-Item -ItemType Directory -Force -Path $ReleasesDir | Out-Null

# ── 4. ضغط dist إلى ZIP ──
$ZipName    = "erp-update-v$Version.zip"
$ZipPath    = Join-Path $ReleasesDir $ZipName
Write-Host ""
Write-Host "► ضغط الملفات → $ZipName ..." -ForegroundColor Yellow

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$DistDir\*" -DestinationPath $ZipPath -CompressionLevel Optimal
$sizeKB = [math]::Round((Get-Item $ZipPath).Length / 1KB)
Write-Host "  ✓ حجم الملف: $sizeKB KB" -ForegroundColor Green

# ── 5. إنشاء release-notes.txt ──
$notesPath = Join-Path $ReleasesDir "release-notes-v$Version.txt"
$notesContent = @"
الإصدار: $Version
التاريخ: $(Get-Date -Format "yyyy-MM-dd HH:mm")
الملاحظات: $Notes
الملف: $ZipName
"@
[System.IO.File]::WriteAllText($notesPath, $notesContent, [System.Text.Encoding]::UTF8)

# ── 6. ملخص ──
Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✅ الملف جاهز للرفع!                   " -ForegroundColor Green
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📦 الملف   : releases\$ZipName" -ForegroundColor White
Write-Host "  🔢 الإصدار : $Version" -ForegroundColor White
Write-Host "  📝 الوصف   : $Notes" -ForegroundColor White
Write-Host ""
Write-Host "  الخطوة التالية:" -ForegroundColor Yellow
Write-Host "  1. افتح موقع التحديثات" -ForegroundColor White
Write-Host "  2. اكتب الإصدار: $Version" -ForegroundColor White
Write-Host "  3. ارفع الملف: releases\$ZipName" -ForegroundColor White
Write-Host ""

# ── 7. فتح المجلد تلقائياً ──
Start-Process explorer.exe $ReleasesDir
