# VISITA Security Fix - Phase 1 Automated Script
# Execute this script to automatically secure your Firebase configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VISITA Security Setup - Phase 1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current git status
Write-Host "Step 1: Checking for sensitive files in git..." -ForegroundColor Yellow
Write-Host ""

$sensitiveFiles = @(
    "mobile-app/android/app/google-services.json",
    "admin-dashboard/.env",
    "mobile-app/lib/firebase_options.dart",
    "mobile-app/ios/GoogleService-Info.plist"
)

$trackedSensitiveFiles = @()
foreach ($file in $sensitiveFiles) {
    $isTracked = git ls-files $file 2>$null
    if ($isTracked) {
        $trackedSensitiveFiles += $file
        Write-Host "  ❌ TRACKED: $file" -ForegroundColor Red
    } else {
        Write-Host "  ✅ Not tracked: $file" -ForegroundColor Green
    }
}

Write-Host ""

if ($trackedSensitiveFiles.Count -eq 0) {
    Write-Host "✅ No sensitive files are tracked in git!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Found $($trackedSensitiveFiles.Count) sensitive file(s) tracked in git" -ForegroundColor Red
    Write-Host ""
    
    $response = Read-Host "Do you want to remove these from git tracking? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        # Step 2: Remove from git tracking
        Write-Host ""
        Write-Host "Step 2: Removing sensitive files from git tracking..." -ForegroundColor Yellow
        Write-Host ""
        
        foreach ($file in $trackedSensitiveFiles) {
            try {
                git rm --cached $file 2>$null
                Write-Host "  ✅ Removed: $file" -ForegroundColor Green
            } catch {
                Write-Host "  ⚠️  Could not remove: $file" -ForegroundColor Yellow
            }
        }
        
        # Step 3: Verify .gitignore
        Write-Host ""
        Write-Host "Step 3: Verifying .gitignore..." -ForegroundColor Yellow
        Write-Host ""
        
        $gitignorePath = ".gitignore"
        $requiredEntries = @(
            "# Firebase Configuration",
            "admin-dashboard/.env",
            "mobile-app/lib/firebase_options.dart",
            "mobile-app/android/app/google-services.json",
            "mobile-app/ios/GoogleService-Info.plist"
        )
        
        $gitignoreContent = Get-Content $gitignorePath -ErrorAction SilentlyContinue
        $missingEntries = @()
        
        foreach ($entry in $requiredEntries) {
            if ($gitignoreContent -notcontains $entry) {
                $missingEntries += $entry
            }
        }
        
        if ($missingEntries.Count -gt 0) {
            Write-Host "  ⚠️  Adding missing entries to .gitignore..." -ForegroundColor Yellow
            Add-Content -Path $gitignorePath -Value "`n# Added by security setup script"
            foreach ($entry in $missingEntries) {
                Add-Content -Path $gitignorePath -Value $entry
                Write-Host "    Added: $entry" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  ✅ .gitignore is properly configured" -ForegroundColor Green
        }
        
        # Step 4: Show git status
        Write-Host ""
        Write-Host "Step 4: Current git status:" -ForegroundColor Yellow
        Write-Host ""
        git status --short
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  Git Security Setup Complete!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Review the changes with: git status" -ForegroundColor White
        Write-Host "2. Commit the changes with:" -ForegroundColor White
        Write-Host "   git commit -m '🔒 Security: Remove sensitive Firebase config files'" -ForegroundColor Cyan
        Write-Host "3. Continue with API key restrictions (see PHASE_1_SECURITY_SETUP.md)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "Skipped removing files from git tracking." -ForegroundColor Yellow
    }
}

# Step 5: Create backup directory
Write-Host ""
Write-Host "Step 5: Creating backup of sensitive files..." -ForegroundColor Yellow
Write-Host ""

$backupDir = "C:\VisitaBackups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "  ✅ Created backup directory: $backupDir" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  Backup directory already exists: $backupDir" -ForegroundColor Cyan
}

$backupFiles = @{
    "admin-dashboard\.env" = "$backupDir\.env.backup"
    "mobile-app\lib\firebase_options.dart" = "$backupDir\firebase_options.dart.backup"
    "mobile-app\android\app\google-services.json" = "$backupDir\google-services.json.backup"
    "mobile-app\ios\GoogleService-Info.plist" = "$backupDir\GoogleService-Info.plist.backup"
}

foreach ($source in $backupFiles.Keys) {
    $destination = $backupFiles[$source]
    if (Test-Path $source) {
        Copy-Item $source $destination -Force
        Write-Host "  ✅ Backed up: $source" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  File not found: $source" -ForegroundColor Yellow
    }
}

# Step 6: Verify example files exist
Write-Host ""
Write-Host "Step 6: Verifying example configuration files..." -ForegroundColor Yellow
Write-Host ""

$exampleFiles = @(
    "admin-dashboard\.env.example",
    "mobile-app\lib\firebase_options.example.dart"
)

foreach ($file in $exampleFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
    }
}

# Step 7: Summary and Next Steps
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Phase 1 Git Security - Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Completed Tasks:" -ForegroundColor Green
Write-Host "  • Checked for sensitive files in git"
Write-Host "  • Removed sensitive files from tracking (if confirmed)"
Write-Host "  • Verified .gitignore configuration"
Write-Host "  • Created backups in $backupDir"
Write-Host "  • Verified example configuration files"
Write-Host ""
Write-Host "🔜 Remaining Phase 1 Tasks:" -ForegroundColor Yellow
Write-Host "  1. Restrict API keys in Google Cloud Console"
Write-Host "  2. Enable Email/Password authentication in Firebase"
Write-Host "  3. Deploy Firebase security rules"
Write-Host ""
Write-Host "📖 See PHASE_1_SECURITY_SETUP.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
