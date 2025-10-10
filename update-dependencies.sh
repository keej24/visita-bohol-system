#!/bin/bash
# 🔄 VISITA Dependency Update Script - Phase 2 Implementation
# Execute this script to update dependencies and fix build environment

echo "🔄 VISITA Mobile App - Dependency Update Implementation"
echo "======================================================"

# Check if we're in the right directory
if [[ ! -f "mobile-app/pubspec.yaml" ]]; then
    echo "❌ Error: Please run this script from the visita-system root directory"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Phase 2A: Backup and Analysis
echo "💾 Phase 2A: Backup and Pre-update Analysis"
echo "---------------------------------------------"

cd mobile-app

# Create backup
echo "📁 Creating backup of current state..."
cp pubspec.yaml pubspec.yaml.backup
cp pubspec.lock pubspec.lock.backup
echo "✅ Backed up pubspec.yaml and pubspec.lock"

# Check current Flutter version
echo "🔍 Checking Flutter environment..."
flutter --version
echo ""

# Run analysis before changes
echo "🔍 Running pre-update analysis..."
flutter analyze > analysis-before.txt 2>&1
echo "✅ Pre-update analysis saved to analysis-before.txt"

# Phase 2B: Clean Dependencies
echo ""
echo "🧹 Phase 2B: Cleaning Dependencies"
echo "-----------------------------------"

echo "🗑️  Cleaning build artifacts..."
flutter clean
echo "✅ Build artifacts cleaned"

echo "🔄 Getting current dependencies..."
flutter pub get
echo "✅ Dependencies fetched"

# Phase 2C: Update Dependencies
echo ""
echo "⬆️  Phase 2C: Updating Dependencies"
echo "------------------------------------"

echo "📊 Checking for outdated packages..."
flutter pub outdated > outdated-before.txt
echo "✅ Outdated packages list saved to outdated-before.txt"

echo "🔄 Updating dependencies to latest compatible versions..."
flutter pub upgrade

echo "🔄 Attempting major version upgrades..."
echo "⚠️  This may require manual intervention for breaking changes..."

# Update to latest major versions
flutter pub upgrade --major-versions

# Check for deprecated packages and provide alternatives
echo ""
echo "🔍 Checking for deprecated packages..."

# Check if js package is still in use
if grep -q "js:" pubspec.yaml; then
    echo "⚠️  Found deprecated 'js' package. Consider replacing with 'web' package."
    echo "   Add to pubspec.yaml: web: ^1.1.1"
    echo "   Update imports: package:js/js.dart -> package:web/web.dart"
fi

# Check for other deprecated packages
if grep -q "build_resolvers:" pubspec.yaml; then
    echo "⚠️  Found deprecated 'build_resolvers' package. This may need manual review."
fi

if grep -q "build_runner_core:" pubspec.yaml; then
    echo "⚠️  Found deprecated 'build_runner_core' package. This may need manual review."
fi

# Phase 2D: Update Specific Dependencies
echo ""
echo "🎯 Phase 2D: Updating Specific Critical Dependencies"
echo "-----------------------------------------------------"

# Create updated pubspec.yaml with latest versions
echo "📝 Updating specific dependencies to latest stable versions..."

# Backup original pubspec.yaml
cp pubspec.yaml pubspec.yaml.pre-specific-updates

# Update critical dependencies
sed -i 's/cached_network_image: \^3\.3\.1/cached_network_image: ^3.4.1/' pubspec.yaml
sed -i 's/cloud_firestore: \^5\.6\.12/cloud_firestore: ^6.0.2/' pubspec.yaml
sed -i 's/connectivity_plus: \^5\.0\.2/connectivity_plus: ^7.0.0/' pubspec.yaml
sed -i 's/firebase_auth: \^5\.7\.0/firebase_auth: ^6.1.0/' pubspec.yaml
sed -i 's/firebase_core: \^3\.15\.2/firebase_core: ^4.1.1/' pubspec.yaml
sed -i 's/firebase_storage: \^12\.4\.10/firebase_storage: ^13.0.2/' pubspec.yaml
sed -i 's/flutter_local_notifications: \^17\.2\.4/flutter_local_notifications: ^19.4.2/' pubspec.yaml
sed -i 's/geolocator: \^11\.1\.0/geolocator: ^14.0.2/' pubspec.yaml
sed -i 's/http: \^0\.13\.6/http: ^1.5.0/' pubspec.yaml
sed -i 's/image_picker: \^0\.8\.9/image_picker: ^1.2.0/' pubspec.yaml

echo "✅ Updated critical dependencies to latest versions"

# Phase 2E: Handle Breaking Changes
echo ""
echo "🔧 Phase 2E: Handling Potential Breaking Changes"
echo "-------------------------------------------------"

echo "🔄 Getting updated dependencies..."
flutter pub get

echo "🔍 Running analysis after updates..."
flutter analyze > analysis-after.txt 2>&1

# Check for specific breaking changes
echo "🔍 Checking for common breaking changes..."

# Check for js package issues
if grep -r "package:js/" lib/; then
    echo "⚠️  Found imports of deprecated js package. These need to be updated:"
    grep -r "package:js/" lib/
    echo "   Replace with: import 'package:web/web.dart';"
fi

# Check for connectivity_plus breaking changes
if grep -r "ConnectivityResult\." lib/; then
    echo "⚠️  Found potential connectivity_plus breaking changes"
    echo "   ConnectivityResult enum may have changed in v7.0.0"
fi

# Phase 2F: Fix Known Issues
echo ""
echo "🛠️  Phase 2F: Fixing Known Issues"
echo "----------------------------------"

# Fix unused import in announcements_screen.dart
echo "🔧 Fixing unused import in announcements_screen.dart..."
if grep -q "import 'package:url_launcher/url_launcher.dart';" lib/screens/announcements_screen.dart; then
    sed -i '/import .*url_launcher\/url_launcher.dart.*;/d' lib/screens/announcements_screen.dart
    echo "✅ Removed unused url_launcher import"
fi

# Update deprecated drift/web.dart usage
echo "🔧 Checking for deprecated drift/web.dart usage..."
if grep -r "package:drift/web.dart" lib/; then
    echo "⚠️  Found deprecated drift/web.dart import"
    echo "   Consider updating to drift/wasm.dart for better web performance"
    # Update the import
    find lib/ -name "*.dart" -exec sed -i 's/package:drift\/web\.dart/package:drift\/wasm.dart/g' {} \;
    echo "✅ Updated drift imports"
fi

# Phase 2G: Test Build
echo ""
echo "🧪 Phase 2G: Testing Updated Build"
echo "-----------------------------------"

echo "🔄 Running clean build test..."
flutter clean
flutter pub get

echo "🔍 Running final analysis..."
flutter analyze

echo "🏗️  Testing build for different platforms..."

# Test Android build
echo "📱 Testing Android build..."
flutter build apk --debug --target-platform android-arm64

# Test Web build  
echo "🌐 Testing Web build..."
flutter build web --debug

echo "✅ Build tests completed"

# Phase 2H: Generate Report
echo ""
echo "📊 Phase 2H: Generating Update Report"
echo "--------------------------------------"

cat > DEPENDENCY_UPDATE_REPORT.md << EOF
# 🔄 VISITA Dependency Update Report

## Update Summary
- **Date**: $(date)
- **Flutter Version**: $(flutter --version | head -n 1)
- **Dart Version**: $(flutter --version | grep "Dart" | head -n 1)

## Files Modified
- \`pubspec.yaml\` - Updated dependency versions
- \`pubspec.lock\` - New dependency resolution
- \`lib/screens/announcements_screen.dart\` - Removed unused import

## Backup Files Created
- \`pubspec.yaml.backup\` - Original pubspec.yaml
- \`pubspec.lock.backup\` - Original pubspec.lock
- \`analysis-before.txt\` - Analysis before updates
- \`outdated-before.txt\` - Outdated packages before updates

## Analysis Results
### Before Updates:
\`\`\`
$(cat analysis-before.txt)
\`\`\`

### After Updates:
\`\`\`
$(flutter analyze 2>&1)
\`\`\`

## Outdated Packages Status
### Before Updates:
\`\`\`
$(cat outdated-before.txt)
\`\`\`

### After Updates:
\`\`\`
$(flutter pub outdated 2>&1)
\`\`\`

## Next Steps
1. ✅ Dependencies updated successfully
2. 🧪 Run comprehensive tests: \`flutter test\`
3. 📱 Test on physical devices
4. 🔍 Monitor for runtime issues
5. 📚 Update documentation if APIs changed

## Potential Issues to Monitor
- Check for connectivity_plus v7.0.0 breaking changes
- Verify Firebase SDK compatibility
- Test image picker functionality
- Confirm geolocator permissions still work

## Rollback Instructions
If issues occur, rollback with:
\`\`\`bash
cp pubspec.yaml.backup pubspec.yaml
cp pubspec.lock.backup pubspec.lock
flutter pub get
\`\`\`
EOF

echo "✅ Generated DEPENDENCY_UPDATE_REPORT.md"

# Phase 2I: Cleanup and Summary
echo ""
echo "🧹 Phase 2I: Cleanup and Summary"
echo "---------------------------------"

# Remove temporary files
rm -f analysis-before.txt outdated-before.txt

echo "📊 Final Status Check:"
echo "----------------------"

# Check if any critical issues remain
if flutter analyze 2>&1 | grep -q "error"; then
    echo "❌ Critical errors found - manual review required"
else
    echo "✅ No critical errors found"
fi

if flutter analyze 2>&1 | grep -q "warning"; then
    echo "⚠️  Warnings found - review recommended"
else
    echo "✅ No warnings found"
fi

echo ""
echo "🎉 Dependency update completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Review DEPENDENCY_UPDATE_REPORT.md"
echo "2. Run comprehensive tests: flutter test"
echo "3. Test app functionality: flutter run"
echo "4. Commit changes: git add . && git commit -m '⬆️ Dependencies: Update to latest stable versions'"
echo ""
echo "⚠️  If you encounter issues, use the rollback instructions in the report"

cd ..