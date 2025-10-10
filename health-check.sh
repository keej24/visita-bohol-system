#!/bin/bash
# 🔍 VISITA Project Health Monitor
# Comprehensive health check and monitoring for the VISITA mobile app

echo "🔍 VISITA Project Health Monitor"
echo "================================="
echo "📅 Health Check Date: $(date)"
echo ""

# Navigate to project root
if [[ ! -f "mobile-app/pubspec.yaml" ]]; then
    echo "❌ Error: Please run this script from the visita-system root directory"
    exit 1
fi

# Initialize counters
total_checks=0
passed_checks=0
critical_issues=0
warnings=0

function check_status() {
    total_checks=$((total_checks + 1))
    if [[ $1 -eq 0 ]]; then
        echo "✅ $2"
        passed_checks=$((passed_checks + 1))
    else
        if [[ "$3" == "critical" ]]; then
            echo "❌ $2"
            critical_issues=$((critical_issues + 1))
        else
            echo "⚠️  $2"
            warnings=$((warnings + 1))
        fi
    fi
}

# Header
echo "🏥 SYSTEM HEALTH OVERVIEW"
echo "========================="

# 1. Flutter Environment Check
echo "🔧 Flutter Environment:"
echo "------------------------"

flutter --version > /dev/null 2>&1
check_status $? "Flutter SDK installed and accessible"

# Check Flutter doctor
flutter doctor -v > flutter_doctor_output.txt 2>&1
if grep -q "No issues found!" flutter_doctor_output.txt; then
    check_status 0 "Flutter doctor - No issues found"
else
    check_status 1 "Flutter doctor - Issues detected (see flutter_doctor_output.txt)" "warning"
fi

# 2. Security Status Check
echo ""
echo "🔒 SECURITY STATUS:"
echo "-------------------"

# Check if sensitive files are tracked in git
git ls-files | grep -q "firebase_options.dart"
if [[ $? -eq 0 ]]; then
    check_status 1 "Firebase options file not tracked in git" "critical"
else
    check_status 0 "Firebase options file properly secured"
fi

git ls-files | grep -q "google-services.json"
if [[ $? -eq 0 ]]; then
    check_status 1 "Google services file not tracked in git" "critical"
else
    check_status 0 "Google services file properly secured"
fi

git ls-files | grep -q "admin-dashboard/.env"
if [[ $? -eq 0 ]]; then
    check_status 1 "Environment file not tracked in git" "critical"
else
    check_status 0 "Environment file properly secured"
fi

# Check .gitignore
grep -q "firebase_options.dart" .gitignore
check_status $? ".gitignore includes Firebase options"

grep -q ".env" .gitignore
check_status $? ".gitignore includes environment files"

# 3. Code Quality Check
echo ""
echo "📝 CODE QUALITY:"
echo "----------------"

cd mobile-app

# Run Flutter analyze
flutter analyze > analyze_output.txt 2>&1
analyze_errors=$(grep -c "error" analyze_output.txt)
analyze_warnings=$(grep -c "warning" analyze_output.txt)
analyze_info=$(grep -c "info" analyze_output.txt)

if [[ $analyze_errors -eq 0 ]]; then
    check_status 0 "Flutter analyze - No errors found"
else
    check_status 1 "Flutter analyze - $analyze_errors errors found" "critical"
fi

if [[ $analyze_warnings -eq 0 ]]; then
    check_status 0 "Flutter analyze - No warnings found"
else
    check_status 1 "Flutter analyze - $analyze_warnings warnings found" "warning"
fi

# 4. Dependency Status
echo ""
echo "📦 DEPENDENCY STATUS:"
echo "--------------------"

# Check for outdated packages
flutter pub outdated > outdated_output.txt 2>&1
outdated_count=$(grep -c "^[a-zA-Z]" outdated_output.txt | head -1)

if [[ $outdated_count -lt 5 ]]; then
    check_status 0 "Dependencies mostly up to date ($outdated_count outdated)"
else
    check_status 1 "Many outdated dependencies ($outdated_count)" "warning"
fi

# Check for deprecated packages
if grep -q "js:" pubspec.yaml; then
    check_status 1 "Deprecated 'js' package found" "warning"
else
    check_status 0 "No deprecated 'js' package"
fi

# 5. Build Status
echo ""
echo "🏗️  BUILD STATUS:"
echo "-----------------"

# Test build
flutter clean > /dev/null 2>&1
flutter pub get > /dev/null 2>&1

# Test debug build
flutter build apk --debug --quiet > build_output.txt 2>&1
check_status $? "Android debug build successful"

# Test web build
flutter build web --debug --quiet > web_build_output.txt 2>&1
check_status $? "Web debug build successful"

# 6. Testing Status
echo ""
echo "🧪 TESTING STATUS:"
echo "------------------"

# Check if tests exist
if [[ -d "test" ]]; then
    test_files=$(find test -name "*.dart" | wc -l)
    if [[ $test_files -gt 0 ]]; then
        check_status 0 "Test files found ($test_files tests)"
        
        # Run tests
        flutter test > test_output.txt 2>&1
        check_status $? "Test execution successful"
    else
        check_status 1 "No test files found" "warning"
    fi
else
    check_status 1 "Test directory not found" "warning"
fi

# Check for integration tests
if [[ -d "integration_test" ]]; then
    integration_files=$(find integration_test -name "*.dart" | wc -l)
    if [[ $integration_files -gt 0 ]]; then
        check_status 0 "Integration tests found ($integration_files tests)"
    else
        check_status 1 "No integration test files" "warning"
    fi
else
    check_status 1 "Integration test directory not found" "warning"
fi

# 7. Performance Indicators
echo ""
echo "⚡ PERFORMANCE INDICATORS:"
echo "-------------------------"

# Check app size
apk_size=$(ls -la build/app/outputs/flutter-apk/app-debug.apk 2>/dev/null | awk '{print $5}')
if [[ -n "$apk_size" ]]; then
    apk_size_mb=$((apk_size / 1024 / 1024))
    if [[ $apk_size_mb -lt 50 ]]; then
        check_status 0 "APK size reasonable (${apk_size_mb}MB)"
    else
        check_status 1 "APK size large (${apk_size_mb}MB)" "warning"
    fi
else
    check_status 1 "APK size not available" "warning"
fi

# Check for memory leaks indicators
if grep -r "dispose()" lib/ > /dev/null 2>&1; then
    check_status 0 "Widget disposal methods found"
else
    check_status 1 "No widget disposal methods found" "warning"
fi

# 8. Firebase Configuration
echo ""
echo "🔥 FIREBASE STATUS:"
echo "-------------------"

if [[ -f "lib/firebase_options.dart" ]]; then
    check_status 0 "Firebase options file exists"
    
    # Check if it has real configuration
    if grep -q "your_project_id_here" lib/firebase_options.dart; then
        check_status 1 "Firebase options file has placeholder values" "warning"
    else
        check_status 0 "Firebase options file appears configured"
    fi
else
    check_status 1 "Firebase options file not found" "critical"
fi

# 9. Git Repository Health
echo ""
echo "📂 REPOSITORY STATUS:"
echo "--------------------"

cd ..

# Check for uncommitted changes
git status --porcelain > git_status.txt
uncommitted_files=$(wc -l < git_status.txt)

if [[ $uncommitted_files -eq 0 ]]; then
    check_status 0 "No uncommitted changes"
else
    check_status 1 "$uncommitted_files files with uncommitted changes" "warning"
fi

# Check recent commit activity
recent_commits=$(git log --since="7 days ago" --oneline | wc -l)
if [[ $recent_commits -gt 0 ]]; then
    check_status 0 "Recent development activity ($recent_commits commits this week)"
else
    check_status 1 "No recent development activity" "warning"
fi

# 10. Documentation Status
echo ""
echo "📚 DOCUMENTATION STATUS:"
echo "------------------------"

# Check for key documentation files
for file in README.md IMPLEMENTATION_PLAN.md IMPLEMENTATION_CHECKLIST.md; do
    if [[ -f "$file" ]]; then
        check_status 0 "$file exists"
    else
        check_status 1 "$file missing" "warning"
    fi
done

# Generate Health Report
echo ""
echo "📊 HEALTH REPORT SUMMARY"
echo "========================="

health_percentage=$((passed_checks * 100 / total_checks))

echo "📈 Overall Health Score: $health_percentage% ($passed_checks/$total_checks checks passed)"
echo "❌ Critical Issues: $critical_issues"
echo "⚠️  Warnings: $warnings"
echo ""

# Health Status
if [[ $critical_issues -eq 0 && $health_percentage -ge 90 ]]; then
    echo "🟢 Project Status: HEALTHY"
    project_status="HEALTHY"
elif [[ $critical_issues -eq 0 && $health_percentage -ge 70 ]]; then
    echo "🟡 Project Status: NEEDS ATTENTION"
    project_status="NEEDS_ATTENTION"
elif [[ $critical_issues -lt 3 && $health_percentage -ge 50 ]]; then
    echo "🟠 Project Status: REQUIRES WORK"
    project_status="REQUIRES_WORK"
else
    echo "🔴 Project Status: CRITICAL ISSUES"
    project_status="CRITICAL"
fi

echo ""

# Recommendations
echo "🎯 RECOMMENDATIONS:"
echo "-------------------"

if [[ $critical_issues -gt 0 ]]; then
    echo "🚨 IMMEDIATE: Address $critical_issues critical security/build issues"
fi

if [[ $warnings -gt 5 ]]; then
    echo "⚠️  HIGH: Review and resolve $warnings warnings"
fi

if [[ $health_percentage -lt 80 ]]; then
    echo "📋 MEDIUM: Follow IMPLEMENTATION_PLAN.md to improve project health"
fi

if [[ $project_status == "HEALTHY" ]]; then
    echo "✅ MAINTENANCE: Continue regular monitoring and maintenance"
fi

# Generate detailed report file
cat > PROJECT_HEALTH_REPORT.md << EOF
# 🏥 VISITA Project Health Report

**Generated**: $(date)
**Health Score**: $health_percentage% ($passed_checks/$total_checks)
**Status**: $project_status

## 📊 Summary
- ✅ Passed Checks: $passed_checks
- ❌ Critical Issues: $critical_issues  
- ⚠️  Warnings: $warnings
- 📝 Total Checks: $total_checks

## 🔍 Detailed Results

### Security Status
- Firebase configuration security: $(if [[ $(git ls-files | grep -c "firebase_options.dart") -eq 0 ]]; then echo "✅ SECURE"; else echo "❌ VULNERABLE"; fi)
- Environment files security: $(if [[ $(git ls-files | grep -c ".env") -eq 0 ]]; then echo "✅ SECURE"; else echo "❌ VULNERABLE"; fi)

### Code Quality
- Flutter analyze errors: $analyze_errors
- Flutter analyze warnings: $analyze_warnings
- Flutter analyze info: $analyze_info

### Dependencies
- Outdated packages: $outdated_count
- Deprecated packages: $(if grep -q "js:" mobile-app/pubspec.yaml; then echo "Found"; else echo "None"; fi)

### Build Status
- Android build: $(if flutter build apk --debug --quiet >/dev/null 2>&1; then echo "✅ SUCCESS"; else echo "❌ FAILED"; fi)
- Web build: $(if flutter build web --debug --quiet >/dev/null 2>&1; then echo "✅ SUCCESS"; else echo "❌ FAILED"; fi)

### Testing
- Unit tests: $(find mobile-app/test -name "*.dart" 2>/dev/null | wc -l) files
- Integration tests: $(find mobile-app/integration_test -name "*.dart" 2>/dev/null | wc -l) files

## 📋 Action Items

### Critical (Fix Immediately)
$(if [[ $critical_issues -gt 0 ]]; then echo "- Address $critical_issues critical issues identified above"; else echo "- None"; fi)

### High Priority (This Week)
$(if [[ $warnings -gt 5 ]]; then echo "- Review and resolve $warnings warnings"; else echo "- Continue regular maintenance"; fi)

### Medium Priority (Next Sprint)
- Review IMPLEMENTATION_PLAN.md for optimization opportunities
- Enhance test coverage
- Update outdated dependencies

## 📈 Trends
- Recent commits: $recent_commits (last 7 days)
- Uncommitted changes: $uncommitted_files files

## 🎯 Next Health Check
**Recommended**: $(date -d '+1 week')

---
*Generated by VISITA Project Health Monitor*
EOF

echo "📄 Detailed report saved to: PROJECT_HEALTH_REPORT.md"

# Cleanup temporary files
rm -f flutter_doctor_output.txt analyze_output.txt outdated_output.txt
rm -f build_output.txt web_build_output.txt test_output.txt git_status.txt

echo ""
echo "🏁 Health check completed!"
echo "📊 Review PROJECT_HEALTH_REPORT.md for detailed analysis"

# Return appropriate exit code
if [[ $project_status == "CRITICAL" ]]; then
    exit 2
elif [[ $critical_issues -gt 0 ]]; then
    exit 1
else
    exit 0
fi