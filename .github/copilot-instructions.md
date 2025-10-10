# VISITA Bohol Churches Information System - AI Agent Guide

## Project Overview

VISITA is a **monorepo heritage management system** serving two dioceses (Tagbilaran & Talibon) in Bohol, Philippines. It consists of:
- **Mobile App** (Flutter/Dart) - Public church exploration with offline capabilities
- **Admin Dashboard** (React/TypeScript/Vite) - Multi-role administrative interface
- **Shared Firebase Backend** - Authentication, Firestore, Storage

**Critical Context**: This project has documented security vulnerabilities (exposed API keys, outdated dependencies). See `QUICK_START_GUIDE.md` for remediation steps.

## Architecture & Key Patterns

### Multi-Role Authorization System

Both apps implement **4-role hierarchical access control**:
1. **Chancery Office** (Admin) - Diocese-wide management, user creation, final approval
2. **Museum Researcher** - Heritage site validation for ICP/NCT churches
3. **Parish Secretary** - Individual church management
4. **Public User** (mobile only) - Browse, feedback, visit tracking

**Admin Dashboard**: Role-based routing via `AuthContext` + custom guards:
```typescript
// See admin-dashboard/src/contexts/AuthContext.tsx
export type UserRole = 'chancery_office' | 'museum_researcher' | 'parish_secretary';
export type Diocese = 'tagbilaran' | 'talibon';

// Access control pattern:
userProfile.diocese  // Enforces diocese-specific data filtering
hasAccess(targetDiocese, targetParish)  // Granular permission checks
```

**Mobile App**: Provider pattern with `AppState` managing user state:
```dart
// See mobile-app/lib/models/app_state.dart
class AppState extends ChangeNotifier {
  // Visit tracking with location validation (500m radius)
  Future<ValidationResult> markVisitedWithValidation(Church church, Position userPosition)
}
```

### Church Approval Workflow

**3-stage approval pipeline** (critical business logic):
1. Parish submits → `status: 'pending_review'`
2. Chancery reviews:
   - Non-heritage → Direct approval
   - Heritage (ICP/NCT) → Forward to Museum Researcher
3. Museum validates heritage → Final approval

**Implementation**: See `admin-dashboard/src/lib/workflow-state-machine.ts`

### Firebase Data Model

**Firestore Collections** (see `admin-dashboard/database.rules.json`):
- `churches` - Main church documents with nested 360° photo arrays
- `announcements` - Diocese-wide vs. parish-specific (determined by `scope` field)
- `users` - User profiles with `role`, `diocese`, `parish` fields for RBAC
- `feedback` - Public reviews with moderation capabilities
- `visitor_logs` - Analytics data for engagement reports
- `heritage_validations` - Museum researcher verification records

**Security Rules**: Role-based `.read`/`.write` permissions enforced server-side. Client libraries assume authenticated user has valid `auth.token.role` custom claim.

### Offline-First Mobile Architecture

**Mobile app uses dual-mode data access**:
```dart
// See mobile-app/lib/main.dart
const bool kUseFirestoreBackend = true;  // Toggle Firebase vs. local JSON

// Repository Pattern:
ChurchRepository            // Local JSON (bundled assets)
FirestoreChurchRepository   // Firebase live data
OfflineChurchRepository     // Cached with Hive for offline access
```

**Offline Services** (mobile only, disabled on web):
- `ConnectivityService` - Network state monitoring
- `OfflineSyncService` - Background sync with conflict resolution
- `OfflineImageCacheService` - Local image caching with Hive

**Critical**: Always check `!kIsWeb` before using platform-specific packages (geolocator, sqflite, hive).

### Admin Dashboard Code Organization

**Component Architecture**:
- `pages/` - Route-level components (e.g., `TagbilaranDashboard.tsx`, `ParishDashboard.tsx`)
- `components/ui/` - shadcn/ui Radix primitives (never edit directly, regenerate via CLI)
- `components/` - Feature components (forms, charts, filters)
- `contexts/` - React Context providers (`AuthContext`, `AppStateProvider`)
- `lib/` - Utilities, Firebase config, query hooks
- `services/` - Business logic (e.g., `uploadService`, `errorService`)

**State Management**:
- `@tanstack/react-query` for server state (see `lib/optimized/queries.ts`)
- Zustand store at `lib/state/app-store.ts` for client state
- React Context for auth and global app state

**Performance Patterns**:
- Route-based code splitting via `React.lazy()` (see `components/LazyComponents.tsx`)
- Manual chunk splitting in `vite.config.ts` (vendor libs, UI components)
- `React.memo()` for expensive dashboards (e.g., `OptimizedChanceryDashboard`)

## Development Workflows

### Quick Start Commands

**Admin Dashboard**:
```bash
cd admin-dashboard
npm install          # Install dependencies
npm run dev          # Dev server on http://localhost:8080
npm run build        # Production build
firebase deploy      # Deploy to Firebase Hosting
```

**Mobile App**:
```bash
cd mobile-app
flutter pub get                    # Install dependencies
flutter run                        # Run on connected device/emulator
flutter build apk --release        # Android production build
flutter build ios --release        # iOS production build (macOS only)
```

**Firebase Rules Deployment**:
```bash
cd admin-dashboard
firebase deploy --only firestore:rules   # Deploy security rules
firebase deploy --only storage           # Deploy storage rules
```

### Testing Strategy

**Current State**: Limited test coverage (~10%). See `QUICK_START_GUIDE.md` Phase 4 for implementation plan.

**Mobile Tests**:
```bash
flutter test                              # Unit tests
flutter test integration_test/            # Integration tests
```

**Admin Dashboard** (not yet implemented):
```bash
npm run test      # Unit tests (to be added)
```

### Environment Configuration

**Admin Dashboard** uses Vite environment variables:
- `.env.development` - Dev Firebase project
- `.env.production` - Prod Firebase project
- Variables prefixed with `VITE_` are exposed to client (see `lib/env.ts`)

**Mobile App** uses `firebase_options.dart`:
- **Never commit** `firebase_options.dart` (has actual keys)
- Use `firebase_options.example.dart` as template
- Generate via `flutterfire configure` CLI

**Critical**: API keys in this repo are currently **exposed publicly**. Restrict them in Google Cloud Console immediately (see `SECURITY_ALERT_FIREBASE.md`).

## Project-Specific Conventions

### Diocese-Specific Data Filtering

**ALL data queries must filter by diocese** to prevent cross-diocese data leakage:

```typescript
// Admin Dashboard - BAD:
const churches = await getDocs(collection(db, 'churches'));

// Admin Dashboard - GOOD:
const churches = await getDocs(
  query(collection(db, 'churches'), where('diocese', '==', userProfile.diocese))
);
```

```dart
// Mobile App - Firestore queries automatically filter by diocese in repository layer
```

### 360° Photo Integration

**Admin Dashboard** uses Pannellum for 360° virtual tours:
- Component: `components/360/VirtualTour360.tsx`
- Validation: `utils/validate360Image.ts` checks for 2:1 aspect ratio
- Storage: Firebase Storage under `/churches/{churchId}/360/`

**Mobile App** uses `flutter_inappwebview` to embed Pannellum viewer:
- Generates HTML with Pannellum CDN on-the-fly
- See `screens/church_detail_screen.dart` for implementation

### Announcement System Architecture

**Two announcement types** (determined by `scope` field):
- `scope: 'diocese'` - Created by Chancery, displayed on homepage carousel
- `scope: 'parish'` - Created by Parish, displayed only on parish detail page

**Auto-archiving**: Background job archives announcements after `eventDate` passes (implementation in Firebase Functions - not yet deployed).

### Image Upload & Compression

**Admin Dashboard**:
```typescript
// See services/uploadService.ts
- Max file size: 10MB before compression
- Compression: browser-image-compression library
- Multiple upload: Promise.all() with progress tracking
- Storage path: /churches/{churchId}/{type}/{filename}
```

**Mobile App**:
```dart
// See services/enhanced_church_service.dart
- image_picker for camera/gallery access
- Manual compression before upload
- Offline queue if no connectivity
```

### Error Handling Patterns

**Admin Dashboard** uses centralized error service:
```typescript
// See services/errorService.ts
try {
  await riskyOperation();
} catch (error) {
  await ErrorService.logError(error, { context: 'operation-name' });
  toast.error(ErrorService.getUserFriendlyMessage(error));
}
```

**Mobile App** uses try-catch with debug logging:
```dart
try {
  await operation();
  debugPrint('✅ Success message');
} catch (e) {
  debugPrint('❌ Error: $e');
  // Show user-friendly SnackBar
}
```

## Common Pitfalls & Gotchas

1. **Diocese Filtering**: Always filter by `diocese` field in queries. Forgetting this causes cross-diocese data leakage.

2. **Mobile Platform Checks**: Use `if (!kIsWeb)` before accessing platform-specific services (geolocator, sqflite, hive).

3. **Firebase Auth Custom Claims**: User roles are stored in **both** Firestore (`users` collection) and Firebase Auth custom claims. Update both when changing roles.

4. **shadcn/ui Components**: Don't edit files in `admin-dashboard/src/components/ui/` directly. Regenerate via `npx shadcn@latest add <component>`.

5. **Vite Build Imports**: Use `@/` alias for imports (e.g., `@/components/ui/button`). Configured in `vite.config.ts`.

6. **Flutter Provider Pattern**: Always wrap widgets needing state access with `Consumer<T>` or use `Provider.of<T>(context)`.

7. **Firestore Timestamps**: Use `.toDate()` when reading timestamps from Firestore. Use `new Date()` when writing.

8. **Church Status Transitions**: Follow state machine in `lib/workflow-state-machine.ts`. Invalid transitions are rejected by Firestore rules.

## Key Files to Reference

**Architecture**:
- `admin-dashboard/CLAUDE.md` - Comprehensive system architecture
- `QUICK_START_GUIDE.md` - Implementation roadmap
- `database.rules.json` - Firestore security model

**Auth & Routing**:
- `admin-dashboard/src/contexts/AuthContext.tsx` - Role-based access control
- `admin-dashboard/src/App.tsx` - Main routing configuration
- `mobile-app/lib/screens/auth_wrapper.dart` - Mobile auth state management

**Data Access**:
- `mobile-app/lib/repositories/` - Repository pattern implementation
- `admin-dashboard/src/lib/optimized/queries.ts` - React Query hooks
- `admin-dashboard/src/lib/firebase.ts` - Firebase initialization

**Business Logic**:
- `admin-dashboard/src/lib/workflow-state-machine.ts` - Church approval workflow
- `mobile-app/lib/services/visitor_validation_service.dart` - Location-based validation
- `mobile-app/lib/models/app_state.dart` - Visit tracking state

## Working with This Codebase

**Before making changes**:
1. Check if diocese filtering applies to your query
2. Verify role-based permissions for the feature
3. Test with different user roles (use test accounts in AuthContext.tsx)
4. Consider offline behavior for mobile features

**When adding features**:
1. Update both mobile and admin if feature spans both apps
2. Add Firestore security rules for new collections
3. Document user flows in markdown files (follow existing pattern)
4. Test cross-diocese isolation

**When fixing bugs**:
1. Check for diocese leakage first (common source of bugs)
2. Verify error handling follows project patterns
3. Update relevant markdown documentation
4. Test with poor/no network connectivity (mobile)

---

*This guide reflects the codebase as of October 2025. Refer to project markdown files for feature-specific implementation details.*
