# 📦 Phase 2: Dependency Analysis & Update Plan

**Date**: October 8, 2025  
**Project**: VISITA Bohol Churches Information System  
**Phase**: 2 - Dependency Management & Build Fixes

---

## 🎯 Executive Summary

**Current Status**: 
- ✅ Flutter SDK: **3.35.5** (Latest stable, released Sept 26, 2025)
- ✅ Dart SDK: **3.9.2**
- ⚠️ **16 outdated packages** in mobile app
- ⚠️ **2 discontinued packages** (build_resolvers, build_runner_core)
- 🔍 Admin dashboard: Status pending npm audit

**Priority**: MEDIUM (No critical security vulnerabilities, but stability & compatibility improvements needed)

---

## 📱 Mobile App (Flutter) - Dependency Analysis

### Current Environment
```
Flutter: 3.35.5 (stable)
Dart: 3.9.2
SDK Constraint: >=3.0.0 <4.0.0 ✅
```

### Direct Dependencies Status

| Package | Current | Upgradable | Latest | Priority | Breaking Changes? |
|---------|---------|------------|--------|----------|-------------------|
| **drift** | 2.21.0 | - | 2.28.2 | HIGH | ⚠️ Check migration guide |
| **sqlite3_flutter_libs** | 0.5.39 | 0.5.40 | 0.5.40 | LOW | ✅ Minor update |

### Dev Dependencies Status

| Package | Current | Latest | Priority | Notes |
|---------|---------|--------|----------|-------|
| **build_runner** | 2.4.13 | 2.9.0 | HIGH | 🚨 Depends on discontinued packages |
| **drift_dev** | 2.21.2 | 2.28.3 | HIGH | Must match drift version |

### Transitive Dependencies (16 outdated)

#### 🟢 Safe Updates (Minor/Patch versions)
```
✅ logger: 2.6.1 → 2.6.2
✅ sqlite3: 2.9.0 → 2.9.1
✅ watcher: 1.1.3 → 1.1.4
✅ shared_preferences_android: 2.4.13 → 2.4.14
✅ url_launcher_android: 6.3.22 → 6.3.23
✅ webview_flutter_android: 4.10.2 → 4.10.4
✅ win32: 5.14.0 → 5.15.0
```

#### 🟡 Moderate Updates (Potentially breaking)
```
⚠️ characters: 1.4.0 → 1.4.1 (probably safe)
⚠️ test_api: 0.7.6 → 0.7.7 (probably safe)
⚠️ material_color_utilities: 0.11.1 → 0.13.0 (check Material 3 changes)
⚠️ meta: 1.16.0 → 1.17.0 (language features)
⚠️ package_info_plus: 8.3.1 → 9.0.0 (MAJOR version bump)
```

#### 🔴 Major Updates (Breaking changes likely)
```
🚨 unicode: 0.3.1 → 1.1.8 (MAJOR jump - check drift compatibility)
```

### Dev Transitive Dependencies (7 outdated)

#### 🚨 Discontinued Packages
```
❌ build_resolvers: 2.4.2 → 3.0.4 (DISCONTINUED)
❌ build_runner_core: 7.3.2 → 9.3.2 (DISCONTINUED)
```

**Discontinuation Details**:
- **build_resolvers**: See https://dart.dev/go/package-discontinue
- **build_runner_core**: See https://dart.dev/go/package-discontinue
- **Impact**: Used by drift_dev and hive_generator for code generation
- **Status**: Still functional but no future updates
- **Action**: Monitor drift_dev and hive_generator for migration path

#### Other Dev Dependencies
```
⚠️ _fe_analyzer_shared: 67.0.0 → 89.0.0
⚠️ analyzer: 6.4.1 → 8.2.0 (MAJOR)
⚠️ analyzer_plugin: 0.11.3 → 0.13.8
⚠️ build: 2.4.1 → 4.0.1 (MAJOR)
⚠️ build_config: 1.1.2 → 1.2.0
⚠️ dart_style: 2.3.6 → 3.1.2 (MAJOR)
⚠️ shelf_web_socket: 2.0.1 → 3.0.0 (MAJOR)
⚠️ source_gen: 1.5.0 → 4.0.1 (MAJOR)
⚠️ source_helper: 1.3.5 → 1.3.8
⚠️ sqlparser: 0.39.2 → 0.41.2
```

---

## 🌐 Admin Dashboard (React/TypeScript) - Dependency Analysis

### Current Environment
```
Node.js: [Version check pending]
Package Manager: npm
TypeScript: 5.8.3
React: 18.3.1
Vite: 5.4.19
```

### Dependency Categories

#### Core Framework Dependencies (Stable)
```
✅ react: 18.3.1 (latest stable)
✅ react-dom: 18.3.1
✅ typescript: 5.8.3
✅ vite: 5.4.19
```

#### Firebase Dependencies (Recently updated)
```
✅ firebase: 11.10.0 (latest)
✅ firebase-admin: 13.5.0
```

#### UI Libraries (shadcn/ui + Radix)
```
✅ All @radix-ui/* packages recently updated (Oct 2025)
✅ tailwindcss: 3.4.17
✅ lucide-react: 0.462.0
```

#### Data Management
```
✅ @tanstack/react-query: 5.83.0
✅ react-router-dom: 6.30.1
✅ zod: 3.25.76
```

### Potential Updates Needed
- Will check with `npm outdated` in next step
- Focus on security patches and minor updates
- Avoid major version bumps unless necessary

---

## 🔧 Update Strategy & Risk Assessment

### Phase 2.1: Low-Risk Updates (Est: 30 minutes)

**Scope**: Patch and minor version updates
```bash
# Mobile App
flutter pub upgrade --minor-versions

# Admin Dashboard  
npm update
```

**Expected Updates**:
- sqlite3_flutter_libs: 0.5.39 → 0.5.40
- logger: 2.6.1 → 2.6.2
- sqlite3: 2.9.0 → 2.9.1
- watcher: 1.1.3 → 1.1.4
- Various Android/platform-specific plugins

**Risk**: ✅ Very Low - All backward compatible

---

### Phase 2.2: Drift Migration (Est: 1-2 hours)

**Scope**: Update drift and drift_dev ecosystem
```yaml
# Target versions:
drift: ^2.28.2          # Current: 2.21.0
drift_dev: ^2.28.3      # Current: 2.21.2
```

**Breaking Changes to Address**:

1. **drift/web.dart → drift/wasm.dart**
   - **Location**: Any file importing `package:drift/web.dart`
   - **Fix**: Replace with `package:drift/wasm.dart`
   - **Impact**: Web platform database initialization

2. **API Changes (2.21 → 2.28)**
   - Review: https://drift.simonbinder.eu/docs/changelog/
   - Check: Query builder syntax changes
   - Test: All database operations

3. **Code Generation**
   - Re-run: `flutter pub run build_runner build --delete-conflicting-outputs`
   - Verify: Generated `*.g.dart` files compile

**Risk**: 🟡 Medium - Testing required, but well-documented migration

---

### Phase 2.3: Discontinued Packages (Est: 30 minutes - Assessment only)

**Scope**: Document discontinued packages impact

**Current Status**:
- `build_resolvers` (2.4.2) - Used by drift_dev
- `build_runner_core` (7.3.2) - Used by build_runner

**Action Plan**:
1. ✅ Continue using current versions (still functional)
2. 📝 Document in technical debt log
3. 🔍 Monitor drift_dev and hive_generator for migration announcements
4. ⏰ Revisit in Q1 2026 or when drift_dev updates

**Risk**: ✅ Low - Packages work despite discontinuation notice

---

### Phase 2.4: Major Version Updates (Est: 2-3 hours) - DEFERRED

**Scope**: Major version bumps requiring code changes

**Candidates** (defer to Phase 3 or later):
- package_info_plus: 8.3.1 → 9.0.0
- unicode: 0.3.1 → 1.1.8
- analyzer: 6.4.1 → 8.2.0
- build: 2.4.1 → 4.0.1
- source_gen: 1.5.0 → 4.0.1

**Rationale for Deferring**:
- Not blocking current development
- Require thorough testing
- May need code refactoring
- Better suited for dedicated maintenance sprint

**Risk**: ✅ Low risk by deferring - Current versions stable

---

## 🧪 Testing Strategy

### Pre-Update Tests
```bash
# Mobile App
cd mobile-app
flutter analyze                    # Should show minimal warnings
flutter test                       # Run existing tests
flutter build apk --debug          # Verify builds

# Admin Dashboard
cd admin-dashboard
npm run lint                       # Check for linting errors
npm run build                      # Verify production build
```

### Post-Update Tests
```bash
# Mobile App
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter analyze                    # Target: 0 errors
flutter test
flutter run                        # Manual testing

# Admin Dashboard
npm install
npm run build
npm run dev                        # Manual testing
```

### Critical Test Scenarios

#### Mobile App
- [ ] App launches successfully
- [ ] Firebase connection works
- [ ] Church data loads from Firestore
- [ ] Offline mode activates
- [ ] Images load and cache
- [ ] Location services work
- [ ] 360° photo viewer opens

#### Admin Dashboard
- [ ] Login/authentication works
- [ ] Dashboard loads data
- [ ] Church CRUD operations work
- [ ] Image upload functions
- [ ] Reports generate correctly
- [ ] Role-based access enforced

---

## 📋 Execution Checklist

### Pre-Flight
- [x] Backups created (pubspec.yaml, pubspec.lock, package.json, package-lock.json)
- [ ] Git working directory clean (or changes committed)
- [ ] Development environment confirmed working
- [ ] Test suite baseline established

### Execution Order
1. [ ] **Mobile App - Low Risk Updates** (30 min)
   - [ ] Run `flutter pub upgrade --minor-versions`
   - [ ] Run tests
   - [ ] Verify app runs

2. [ ] **Mobile App - Drift Migration** (1-2 hours)
   - [ ] Update drift versions in pubspec.yaml
   - [ ] Fix drift/web.dart → drift/wasm.dart
   - [ ] Run build_runner
   - [ ] Fix any compilation errors
   - [ ] Test database operations
   - [ ] Run full test suite

3. [ ] **Admin Dashboard - Updates** (30 min)
   - [ ] Run `npm outdated` to assess
   - [ ] Run `npm update` for safe updates
   - [ ] Run `npm audit fix` for security patches
   - [ ] Test build process
   - [ ] Manual testing

4. [ ] **Analyzer Cleanup** (30 min)
   - [ ] Run `flutter analyze`
   - [ ] Fix remaining warnings
   - [ ] Verify 0 errors target met

5. [ ] **Final Verification** (1 hour)
   - [ ] Full mobile app test on Android
   - [ ] Full admin dashboard test in browser
   - [ ] Verify all critical features
   - [ ] Document any issues

### Post-Update
- [ ] Git commit with detailed message
- [ ] Update IMPLEMENTATION_CHECKLIST.md
- [ ] Create Phase 2 completion report
- [ ] Tag any issues for future phases

---

## 🚨 Rollback Plan

If critical issues occur:

### Immediate Rollback
```bash
# Restore backups
cp mobile-app/pubspec.yaml.backup mobile-app/pubspec.yaml
cp mobile-app/pubspec.lock.backup mobile-app/pubspec.lock
cp admin-dashboard/package.json.backup admin-dashboard/package.json
cp admin-dashboard/package-lock.json.backup admin-dashboard/package-lock.json

# Clean and reinstall
cd mobile-app
flutter clean
flutter pub get

cd ../admin-dashboard
rm -rf node_modules
npm install
```

### Git Rollback
```bash
# If changes were committed
git revert HEAD

# If changes not committed
git checkout -- mobile-app/pubspec.yaml
git checkout -- admin-dashboard/package.json
```

---

## 📊 Expected Outcomes

### Success Criteria
- ✅ All minor/patch updates applied successfully
- ✅ drift migrated to latest version (2.28.2)
- ✅ `flutter analyze` shows 0 errors
- ✅ All tests passing
- ✅ Mobile app builds and runs on Android
- ✅ Admin dashboard builds and runs in browser
- ✅ No regressions in functionality

### Performance Improvements
- Faster build times (updated build_runner)
- Better database performance (drift 2.28)
- Security patches applied
- Improved type safety

### Technical Debt Addressed
- Reduced outdated package count from 16 to <5
- Documented discontinued packages
- Established update baseline for future maintenance

---

## 📈 Metrics & Monitoring

### Before Updates
```
Outdated Packages: 16
Discontinued Packages: 2
Flutter Analyze Warnings: [To be measured]
Build Time: [To be measured]
```

### After Updates (Target)
```
Outdated Packages: <5 (only major version defers)
Discontinued Packages: 2 (documented, not blocking)
Flutter Analyze Warnings: 0 errors, <5 non-critical warnings
Build Time: [Measure improvement]
```

---

## 📞 Support Resources

### Documentation
- **Drift Migration**: https://drift.simonbinder.eu/docs/changelog/
- **Flutter Packages**: https://pub.dev/
- **npm Registry**: https://www.npmjs.com/

### Issue Escalation
- **Drift issues**: GitHub - simolus3/drift
- **Flutter issues**: GitHub - flutter/flutter
- **Firebase issues**: Firebase Support

---

## ⏭️ Next Steps After Phase 2

Once Phase 2 is complete:
1. **Phase 3**: Performance & Stability Optimization
   - Image loading optimization
   - Database query optimization
   - Memory management improvements

2. **Technical Debt**: Schedule major version updates
   - package_info_plus 9.0
   - unicode 1.1.8
   - analyzer 8.0

3. **Monitoring**: Set up automated dependency updates
   - Dependabot configuration
   - Weekly update reviews

---

**Status**: 🔄 Ready to Execute  
**Next Action**: Run low-risk updates (Phase 2.1)  
**Estimated Total Time**: 3-5 hours
