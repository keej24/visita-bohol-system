# VISITA Vercel Deployment Script
# Run this script to deploy to Vercel

Write-Host "🚀 VISITA Deployment to Vercel" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Not in admin-dashboard directory!" -ForegroundColor Red
    Write-Host "Please run: cd admin-dashboard" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ In correct directory" -ForegroundColor Green
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "Checking Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (!$vercelInstalled) {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Choose deployment type:" -ForegroundColor Cyan
Write-Host "1) Preview Deployment (test URL)" -ForegroundColor White
Write-Host "2) Production Deployment (live URL)" -ForegroundColor White
Write-Host "3) First-time Setup (login + deploy)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🧪 Deploying preview..." -ForegroundColor Yellow
        vercel
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 Deploying to production..." -ForegroundColor Yellow
        vercel --prod
    }
    "3" {
        Write-Host ""
        Write-Host "🔐 Logging into Vercel..." -ForegroundColor Yellow
        vercel login
        Write-Host ""
        Write-Host "🚀 Starting first deployment..." -ForegroundColor Yellow
        vercel
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check your deployment URL in the output above" -ForegroundColor White
Write-Host "2. Add environment variables in Vercel Dashboard" -ForegroundColor White
Write-Host "3. Test your app with multi-tab login" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full guide: VERCEL_DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
