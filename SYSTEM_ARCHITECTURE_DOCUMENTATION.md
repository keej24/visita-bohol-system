# 📖 VISITA System Architecture Documentation

## How the System is Built and How Everything Works

---

## 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Admin Dashboard (Web Application)](#4-admin-dashboard-web-application)
5. [Mobile Application](#5-mobile-application)
6. [Firebase Backend](#6-firebase-backend)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Data Flow & Architecture Patterns](#8-data-flow--architecture-patterns)
9. [Church Approval Workflow](#9-church-approval-workflow)
10. [Key Features Implementation](#10-key-features-implementation)
11. [Database Schema](#11-database-schema)
12. [File Reference Guide](#12-file-reference-guide)

---

## 1. System Overview

VISITA is a **monorepo heritage management system** for Bohol's Catholic churches, serving two dioceses: **Tagbilaran** and **Talibon**. The system consists of three main components:

```
┌──────────────────────────────────────────────────────────────────┐
│                      VISITA SYSTEM                                │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   MOBILE APP        │   ADMIN DASHBOARD   │   FIREBASE BACKEND  │
│   (Flutter/Dart)    │   (React/TypeScript)│   (Google Cloud)    │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ • Browse churches   │ • Manage churches   │ • Authentication    │
│ • View maps         │ • Approve content   │ • Firestore DB      │
│ • Track visits      │ • User management   │ • Cloud Storage     │
│ • Leave feedback    │ • Reports/Analytics │ • Security Rules    │
│ • View announcements│ • Announcements     │ • Hosting           │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### How They Connect

```
┌─────────────┐        ┌─────────────┐
│ Mobile App  │◄──────►│             │
│  (Flutter)  │        │   Firebase  │
└─────────────┘        │   Backend   │
                       │             │
┌─────────────┐        │ • Auth      │
│   Admin     │◄──────►│ • Firestore │
│  Dashboard  │        │ • Storage   │
│   (React)   │        └─────────────┘
└─────────────┘
```

Both applications connect to the **same Firebase project**, sharing:
- User authentication
- Church data in Firestore
- Images in Cloud Storage

---

## 2. Technology Stack

### Admin Dashboard
| Technology | Purpose | Location |
|------------|---------|----------|
| **React 18** | UI Framework | `admin-dashboard/src/` |
| **TypeScript** | Type-safe JavaScript | All `.tsx` and `.ts` files |
| **Vite** | Build tool & dev server | `admin-dashboard/vite.config.ts` |
| **Tailwind CSS** | Utility-first styling | `admin-dashboard/tailwind.config.ts` |
| **shadcn/ui** | UI Component library | `admin-dashboard/src/components/ui/` |
| **React Query** | Server state management | `admin-dashboard/src/lib/optimized/queries.ts` |
| **React Router** | Navigation/routing | `admin-dashboard/src/App.tsx` |
| **Firebase SDK** | Backend services | `admin-dashboard/src/lib/firebase.ts` |

### Mobile Application
| Technology | Purpose | Location |
|------------|---------|----------|
| **Flutter** | Cross-platform framework | `mobile-app/` |
| **Dart** | Programming language | All `.dart` files |
| **Provider** | State management | `mobile-app/lib/main.dart` |
| **Firebase Flutter** | Backend integration | `mobile-app/pubspec.yaml` |
| **Geolocator** | GPS/Location services | Visit validation feature |
| **Cached Network Image** | Image caching | Performance optimization |

### Backend Services (Firebase)
| Service | Purpose | Configuration |
|---------|---------|---------------|
| **Firebase Auth** | User authentication | Email/password login |
| **Cloud Firestore** | NoSQL database | `admin-dashboard/firestore.rules` |
| **Cloud Storage** | File/image storage | `admin-dashboard/storage.rules` |
| **Firebase Hosting** | Web app hosting | `admin-dashboard/firebase.json` |

---

## 3. Project Structure

```
visita-system/
├── admin-dashboard/          # React web application
│   ├── src/
│   │   ├── App.tsx          # Main router (defines all routes)
│   │   ├── main.tsx         # Entry point
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React Context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities & Firebase config
│   │   ├── pages/           # Route-level components
│   │   ├── services/        # Business logic layer
│   │   └── types/           # TypeScript type definitions
│   ├── firestore.rules      # Database security rules
│   └── storage.rules        # Storage security rules
│
├── mobile-app/              # Flutter mobile application
│   ├── lib/
│   │   ├── main.dart        # Entry point & providers setup
│   │   ├── models/          # Data classes
│   │   ├── repositories/    # Data access layer
│   │   ├── services/        # Business logic
│   │   ├── screens/         # UI screens
│   │   ├── widgets/         # Reusable widgets
│   │   └── theme/           # App theming
│   └── pubspec.yaml         # Dependencies
│
├── scripts/                 # Utility scripts
│   ├── seed-data.js        # Sample data seeding
│   └── create-admin-accounts.js  # Account creation
│
└── docs/                    # Documentation
```

---

## 4. Admin Dashboard (Web Application)

### 4.1 Entry Point

**File:** `admin-dashboard/src/main.tsx`
```typescript
// This is the FIRST file that runs when the admin dashboard loads
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
```

**What it does:**
1. Finds the `<div id="root">` in `index.html`
2. Renders the entire React application inside it
3. Loads global CSS styles

### 4.2 Application Router

**File:** `admin-dashboard/src/App.tsx`

This is the "master map" of all pages. It defines:
- Which URLs show which pages
- Which users can access which pages
- How data caching works

```typescript
// Key imports and their purpose:
import { AuthProvider } from "@/contexts/AuthContext";     // User login state
import { ProtectedRoute } from "@/components/ProtectedRoute"; // Login guard
import { DioceseProtectedRoute } from "@/components/DioceseProtectedRoute"; // Diocese-specific guard

// Route structure (simplified):
<Routes>
  {/* PUBLIC ROUTES - Anyone can access */}
  <Route path="/login" element={<Login />} />
  
  {/* PROTECTED ROUTES - Must be logged in */}
  <Route path="/parish" element={
    <ProtectedRoute allowedRoles={['parish_secretary']}>
      <ParishDashboard />
    </ProtectedRoute>
  } />
  
  {/* DIOCESE-PROTECTED ROUTES - Must be in correct diocese */}
  <Route path="/diocese/tagbilaran" element={
    <DioceseProtectedRoute diocese="tagbilaran" allowedRoles={['chancery_office']}>
      <TagbilaranDashboard />
    </DioceseProtectedRoute>
  } />
</Routes>
```

### 4.3 Authentication System

**File:** `admin-dashboard/src/contexts/AuthContext.tsx`

This file manages WHO is logged in and WHAT they can do.

```typescript
// User Roles in VISITA
export type UserRole = 'chancery_office' | 'museum_researcher' | 'parish_secretary';

// User Profile stored in Firestore
export interface UserProfile {
  uid: string;           // Firebase user ID
  email: string;         // Login email
  role: UserRole;        // What they can do
  name: string;          // Display name
  diocese: Diocese;      // Which diocese (tagbilaran/talibon)
  parish?: string;       // For parish secretaries only
}

// What AuthContext provides to all components:
interface AuthContextType {
  user: User | null;              // Firebase auth user
  userProfile: UserProfile | null; // Full profile from Firestore
  loading: boolean;               // Is auth state loading?
  login: (email, password) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role) => boolean;     // Check if user has specific role
  hasAccess: (diocese, parish) => boolean; // Check access permissions
}
```

**How login works:**
1. User enters email/password on Login page
2. `login()` function calls Firebase Auth
3. Firebase returns user object if credentials valid
4. AuthContext loads user's profile from Firestore `users` collection
5. All components can now access `userProfile` via React Context

### 4.4 Service Layer

**Location:** `admin-dashboard/src/services/`

Services contain business logic and database operations:

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| `churchService.ts` | Church CRUD operations | `getChurches()`, `createChurch()`, `updateChurch()` |
| `announcementService.ts` | Announcements management | `getAnnouncements()`, `createAnnouncement()` |
| `feedbackService.ts` | User feedback handling | `getFeedback()`, `moderateFeedback()` |
| `uploadService.ts` | Image uploads | `uploadChurchImage()`, `upload360Photo()` |
| `analyticsService.ts` | Dashboard statistics | `getDioceseStats()`, `getVisitorAnalytics()` |

**Example - churchService.ts:**
```typescript
// How we fetch churches from Firebase
export async function getChurches(diocese: Diocese): Promise<Church[]> {
  const q = query(
    collection(db, 'churches'),           // From 'churches' collection
    where('diocese', '==', diocese),      // Filter by diocese
    orderBy('createdAt', 'desc')          // Sort by newest first
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

### 4.5 Pages (Route Components)

**Location:** `admin-dashboard/src/pages/`

Each page corresponds to a URL route:

| Page | Route | Who Uses It |
|------|-------|-------------|
| `Login.tsx` | `/login` | Everyone |
| `TagbilaranDashboard.tsx` | `/diocese/tagbilaran` | Tagbilaran Chancery |
| `TalibonDashboard.tsx` | `/diocese/talibon` | Talibon Chancery |
| `ParishDashboard.tsx` | `/parish` | Parish Secretaries |
| `MuseumResearcherDashboard.tsx` | `/museum` | Museum Researchers |
| `Churches.tsx` | `/churches` | All admin users |
| `Announcements.tsx` | `/announcements` | Chancery & Parish |
| `Reports.tsx` | `/reports` | Chancery only |

---

## 5. Mobile Application

### 5.1 Entry Point

**File:** `mobile-app/lib/main.dart`

```dart
/// This is the first function called when the app launches
Future<void> main() async {
  // Initialize Flutter engine
  WidgetsFlutterBinding.ensureInitialized();

  // Connect to Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Test connection
  try {
    final snap = await FirebaseFirestore.instance.collection('churches').get();
    debugPrint('Found ${snap.docs.length} churches');
  } catch (e) {
    debugPrint('Connection failed: $e');
  }

  // Launch the app
  runApp(const VisitaApp());
}
```

### 5.2 Dependency Injection (Provider Pattern)

```dart
class VisitaApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // State Management
        ChangeNotifierProvider(create: (_) => AppState()),
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => ProfileService()),
        ChangeNotifierProvider(create: (_) => LocationService()),
        
        // Data Access
        Provider<ChurchRepository>(
          create: (_) => FirestoreChurchRepository(),
        ),
        Provider<AnnouncementRepository>(
          create: (_) => FirestoreAnnouncementRepository(),
        ),
      ],
      child: MaterialApp(
        title: 'VISITA',
        theme: AppTheme.lightTheme,
        home: AuthWrapper(),  // Checks if user is logged in
      ),
    );
  }
}
```

**Provider Pattern Explained:**
- `Provider`: Makes a service available to all widgets
- `ChangeNotifierProvider`: For services that change and need to update UI
- `context.read<ServiceName>()`: Get service (one-time read)
- `context.watch<ServiceName>()`: Get service and rebuild when it changes

### 5.3 Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                    SCREENS (UI)                     │
│         screens/home_screen.dart                    │
│         screens/church_detail_screen.dart           │
├─────────────────────────────────────────────────────┤
│                   SERVICES                          │
│    services/auth_service.dart                       │
│    services/visitor_validation_service.dart         │
│    (Business Logic Layer)                           │
├─────────────────────────────────────────────────────┤
│                 REPOSITORIES                        │
│    repositories/firestore_church_repository.dart    │
│    repositories/announcement_repository.dart        │
│    (Data Access Layer)                              │
├─────────────────────────────────────────────────────┤
│                    MODELS                           │
│    models/church.dart                               │
│    models/announcement.dart                         │
│    (Data Structures)                                │
├─────────────────────────────────────────────────────┤
│                  FIREBASE                           │
│    Cloud Firestore, Authentication, Storage         │
└─────────────────────────────────────────────────────┘
```

### 5.4 Key Screens

| Screen | File | Purpose |
|--------|------|---------|
| Home | `screens/home_screen.dart` | Church listing, search, filters |
| Church Detail | `screens/church_detail_screen.dart` | Full church info, mark visited |
| Map | `screens/map_screen.dart` | Interactive map view |
| Profile | `screens/profile_screen.dart` | User profile, visit history |
| Announcements | `screens/announcements_screen.dart` | News and updates |

### 5.5 State Management (AppState)

**File:** `mobile-app/lib/models/app_state.dart`

Manages user's visit tracking:

```dart
class AppState extends ChangeNotifier {
  List<Church> _visited = [];     // Churches user has visited
  List<Church> _forVisit = [];    // Churches user wants to visit
  
  // Mark a church as visited (with GPS validation)
  Future<ValidationResult> markVisitedWithValidation(
    Church church, 
    Position userPosition
  ) async {
    // Check if user is within 200 meters of church
    final result = await VisitorValidationService.validateProximity(
      church: church,
      userPosition: userPosition,
    );
    
    if (result.isValid) {
      _visited.add(church);
      notifyListeners();  // Tell UI to update
      // Also save to Firestore
    }
    
    return result;
  }
}
```

---

## 6. Firebase Backend

### 6.1 Firebase Initialization

**Admin Dashboard:** `admin-dashboard/src/lib/firebase.ts`
```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { env } from "./env";

// Configuration from environment variables
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Initialize and export services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);      // Authentication
export const db = getFirestore(app);   // Database
export const storage = getStorage(app); // File storage
```

**Mobile App:** `mobile-app/lib/firebase_options.dart`
```dart
// Auto-generated by FlutterFire CLI
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android: return android;
      case TargetPlatform.iOS: return ios;
      // ...
    }
  }
}
```

### 6.2 Firestore Collections

| Collection | Purpose | Example Document |
|------------|---------|------------------|
| `churches` | Church information | `{name, diocese, status, coordinates, images, ...}` |
| `announcements` | News & updates | `{title, content, diocese, scope, eventDate, ...}` |
| `users` | User profiles | `{email, role, diocese, parish, ...}` |
| `feedback` | User reviews | `{churchId, userId, rating, comment, ...}` |
| `visitor_logs` | Visit records | `{userId, churchId, timestamp, location, ...}` |

### 6.3 Security Rules

**File:** `admin-dashboard/firestore.rules`

Security rules control WHO can READ/WRITE data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function hasRole(role) {
      return isAuthenticated() && getUserData().role == role;
    }
    
    // Churches - Everyone can read, only authorized can write
    match /churches/{churchId} {
      allow read: if true;  // Public data
      
      // Only parish secretaries can create in their diocese
      allow create: if hasRole('parish_secretary') &&
                       request.resource.data.diocese == getUserData().diocese;
      
      // Only chancery can approve
      allow update: if hasRole('chancery_office') &&
                       resource.data.diocese == getUserData().diocese;
    }
    
    // Users - Complex rules for different roles
    match /users/{userId} {
      // Users can read their own profile
      allow read: if isAuthenticated() && request.auth.uid == userId;
      
      // Chancery can read all users in their diocese
      allow read: if hasRole('chancery_office') &&
                     resource.data.diocese == getUserData().diocese;
    }
  }
}
```

---

## 7. Authentication & Authorization

### 7.1 User Roles Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CHANCERY_OFFICE (Admin)                                        │
│  ├── Diocese-wide management                                     │
│  ├── Create parish accounts                                      │
│  ├── Approve church submissions                                  │
│  ├── Manage announcements                                        │
│  └── View reports & analytics                                    │
│                                                                  │
│  MUSEUM_RESEARCHER                                               │
│  ├── Review heritage churches (ICP/NCT)                         │
│  ├── Upload heritage declarations                                │
│  └── Cross-diocese read access                                   │
│                                                                  │
│  PARISH_SECRETARY                                                │
│  ├── Manage own church profile                                   │
│  ├── Create parish announcements                                 │
│  └── Limited to their parish only                                │
│                                                                  │
│  PUBLIC_USER (Mobile App)                                        │
│  ├── Browse churches                                             │
│  ├── Track visits                                                │
│  └── Leave feedback                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Access Control Implementation

**Protected Route Component:**
```typescript
// admin-dashboard/src/components/ProtectedRoute.tsx
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, userProfile, loading } = useAuth();
  
  // Show loading while checking auth
  if (loading) return <LoadingSpinner />;
  
  // Redirect to login if not authenticated
  if (!user) return <Navigate to="/login" />;
  
  // Check if user has required role
  if (!allowedRoles.includes(userProfile?.role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
}
```

**Diocese Filter (Critical for Data Isolation):**
```typescript
// Every data query MUST filter by diocese
const churches = await getDocs(
  query(
    collection(db, 'churches'),
    where('diocese', '==', userProfile.diocese)  // CRITICAL!
  )
);
```

---

## 8. Data Flow & Architecture Patterns

### 8.1 Admin Dashboard Data Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   UI Layer   │───►│   Services   │───►│   Firebase   │───►│  Firestore   │
│   (React)    │◄───│   (Logic)    │◄───│    SDK       │◄───│  (Database)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘

Example Flow: Loading Churches

1. User visits /churches page
2. Churches.tsx component mounts
3. useQuery hook calls churchService.getChurches()
4. Service builds Firestore query with filters
5. Firebase SDK sends request to Firestore
6. Firestore returns matching documents
7. Service transforms data to Church[] array
8. React Query caches the data
9. Component renders church list
```

### 8.2 Mobile App Data Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Screens    │───►│  Repository  │───►│   Firebase   │───►│  Firestore   │
│  (Flutter)   │◄───│  (Abstract)  │◄───│    SDK       │◄───│  (Database)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │
       │                   └──────────► Can swap with MockRepository for testing
       │
       └──────────► Uses Provider for dependency injection
```

### 8.3 Repository Pattern (Mobile App)

```dart
// Abstract repository (interface)
// File: mobile-app/lib/repositories/church_repository.dart
abstract class ChurchRepository {
  Future<List<Church>> getAllChurches();
  Future<Church?> getChurchById(String id);
  Future<List<Church>> getChurchesByDiocese(String diocese);
}

// Firestore implementation
// File: mobile-app/lib/repositories/firestore_church_repository.dart
class FirestoreChurchRepository extends ChurchRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  @override
  Future<List<Church>> getAllChurches() async {
    final snapshot = await _firestore
        .collection('churches')
        .where('status', isEqualTo: 'approved')  // Only show approved
        .get();
    
    return snapshot.docs
        .map((doc) => Church.fromJson(doc.data()))
        .toList();
  }
}
```

---

## 9. Church Approval Workflow

### 9.1 State Machine

**File:** `admin-dashboard/src/lib/workflow-state-machine.ts`

The approval workflow follows a state machine pattern:

```
┌─────────┐
│ PENDING │◄──────────────── Parish Secretary submits church
└────┬────┘
     │
     ▼
┌─────────────────┐
│ CHANCERY REVIEW │ Chancery Office reviews submission
└────┬────────────┘
     │
     ├─── Non-heritage church ──────────────► APPROVED ──► Published!
     │
     └─── Heritage church (ICP/NCT) ───┐
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ HERITAGE_REVIEW │ Museum Researcher
                              └────────┬────────┘
                                       │
                                       ▼
                                   APPROVED ──► Published!
```

### 9.2 Implementation

```typescript
// Define allowed transitions
export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  {
    from: 'pending',
    to: 'approved',
    requiredRoles: ['chancery_office'],
    description: 'Approve non-heritage church',
    conditions: (ctx) => !ctx.metadata?.isHeritage,  // Only non-heritage
  },
  {
    from: 'pending',
    to: 'heritage_review',
    requiredRoles: ['chancery_office'],
    description: 'Forward heritage church to museum',
    conditions: (ctx) => ctx.metadata?.isHeritage,  // Only heritage
  },
  {
    from: 'heritage_review',
    to: 'approved',
    requiredRoles: ['museum_researcher'],
    description: 'Museum approves heritage church',
  },
];

// Process a transition
export async function processTransition(context: WorkflowContext) {
  // 1. Find matching transition
  const transition = WORKFLOW_TRANSITIONS.find(t => 
    t.from === context.currentStatus && 
    t.to === context.targetStatus
  );
  
  // 2. Validate user has required role
  if (!transition.requiredRoles.includes(context.userProfile.role)) {
    throw new Error('Unauthorized');
  }
  
  // 3. Check conditions
  if (transition.conditions && !transition.conditions(context)) {
    throw new Error('Conditions not met');
  }
  
  // 4. Update church status
  await updateDoc(doc(db, 'churches', context.churchId), {
    status: context.targetStatus,
    updatedAt: serverTimestamp(),
  });
  
  // 5. Log the change
  await createAuditLog(context);
}
```

---

## 10. Key Features Implementation

### 10.1 Visit Validation (GPS Check)

**File:** `mobile-app/lib/services/visitor_validation_service.dart`

Users must be within 200 meters of a church to mark it as visited:

```dart
class VisitorValidationService {
  static const double visitRadiusMeters = 200.0;
  
  static Future<ValidationResult> validateProximity({
    required Church church,
    required Position userPosition,
  }) async {
    // Calculate distance using Haversine formula
    final distanceMeters = Geolocator.distanceBetween(
      userPosition.latitude,
      userPosition.longitude,
      church.coordinates.latitude,
      church.coordinates.longitude,
    );
    
    if (distanceMeters <= visitRadiusMeters) {
      return ValidationResult(
        isValid: true,
        message: 'Visit validated! You are at the church.',
      );
    } else {
      return ValidationResult(
        isValid: false,
        message: 'Too far! You are ${distanceMeters.round()}m away.',
        distanceMeters: distanceMeters,
      );
    }
  }
}
```

### 10.2 Image Upload

**File:** `admin-dashboard/src/services/uploadService.ts`

```typescript
export async function uploadChurchImage(
  churchId: string,
  file: File,
  type: 'photos' | '360' | 'heritage'
): Promise<string> {
  // 1. Create storage path
  const path = `churches/${churchId}/${type}/${file.name}`;
  const storageRef = ref(storage, path);
  
  // 2. Compress image if too large
  const compressed = await compressImage(file, { maxSizeMB: 2 });
  
  // 3. Upload to Firebase Storage
  const snapshot = await uploadBytes(storageRef, compressed);
  
  // 4. Get public URL
  const url = await getDownloadURL(snapshot.ref);
  
  return url;
}
```

### 10.3 Real-time Updates

**Admin Dashboard (React Query + Firestore):**
```typescript
// Subscribe to real-time updates
export function useChurches(diocese: Diocese) {
  return useQuery({
    queryKey: ['churches', diocese],
    queryFn: () => churchService.getChurches(diocese),
    // React Query handles caching and refetching
  });
}
```

**Mobile App (Firestore Snapshots):**
```dart
// Real-time listener
Stream<List<Church>> watchChurches() {
  return _firestore
      .collection('churches')
      .where('status', isEqualTo: 'approved')
      .snapshots()
      .map((snapshot) => 
          snapshot.docs.map((doc) => Church.fromJson(doc.data())).toList()
      );
}
```

### 10.4 Diocese-Based Data Filtering

**Critical pattern used everywhere:**

```typescript
// Admin Dashboard - Always filter by user's diocese
const userDiocese = userProfile.diocese;  // 'tagbilaran' or 'talibon'

const churches = await getDocs(
  query(
    collection(db, 'churches'),
    where('diocese', '==', userDiocese)  // NEVER forget this!
  )
);
```

```dart
// Mobile App - Filter by diocese
Future<List<Church>> getChurchesByDiocese(String diocese) async {
  final snapshot = await _firestore
      .collection('churches')
      .where('diocese', isEqualTo: diocese)
      .where('status', isEqualTo: 'approved')
      .get();
  // ...
}
```

---

## 11. Database Schema

### 11.1 Churches Collection

```javascript
// Collection: churches
// Document ID: Auto-generated

{
  // Basic Information
  "name": "San Agustin Church",
  "diocese": "tagbilaran",  // "tagbilaran" | "talibon"
  "municipality": "Panglao",
  "status": "approved",     // "pending" | "approved" | "heritage_review" | "rejected"
  
  // Location
  "coordinates": {
    "lat": 9.5772,
    "lng": 123.7741
  },
  "address": "Poblacion, Panglao, Bohol",
  
  // Classification
  "classification": "parish",  // "parish" | "quasi_parish" | "shrine" | etc.
  "heritageClassification": "ICP",  // "ICP" | "NCT" | "none"
  
  // History
  "yearEstablished": 1596,
  "architecturalStyle": "Baroque",
  "historicalBackground": "Built by Augustinian missionaries...",
  
  // Media
  "images": [
    {
      "url": "https://...",
      "caption": "Church facade",
      "isPrimary": true
    }
  ],
  "virtualTour": {
    "panoramaUrl": "https://...",
    "hotspots": []
  },
  
  // Mass Schedule
  "massSchedules": [
    {
      "day": "Sunday",
      "times": ["6:00 AM", "8:00 AM", "10:00 AM"],
      "language": "Filipino"
    }
  ],
  
  // Metadata
  "createdBy": "user_uid_here",
  "createdAt": Timestamp,
  "updatedAt": Timestamp,
  "approvedBy": "chancery_uid_here",
  "approvedAt": Timestamp
}
```

### 11.2 Users Collection

```javascript
// Collection: users
// Document ID: Firebase Auth UID

{
  "uid": "firebase_auth_uid",
  "email": "user@example.com",
  "name": "Juan dela Cruz",
  "role": "parish_secretary",  // "chancery_office" | "museum_researcher" | "parish_secretary" | "public"
  "diocese": "tagbilaran",
  "parish": "panglao_san_agustin",  // Only for parish_secretary
  "status": "active",
  "phoneNumber": "+63...",
  "createdAt": Timestamp,
  "lastLoginAt": Timestamp
}
```

### 11.3 Announcements Collection

```javascript
// Collection: announcements
// Document ID: Auto-generated

{
  "title": "Holy Week Schedule 2025",
  "content": "Please see the schedule below...",
  "diocese": "tagbilaran",
  "scope": "diocese",  // "diocese" (all churches) | "parish" (specific church)
  "churchId": null,    // Set if scope is "parish"
  "eventDate": Timestamp,
  "imageUrl": "https://...",
  "createdBy": "user_uid",
  "createdAt": Timestamp,
  "isArchived": false
}
```

---

## 12. File Reference Guide

### Admin Dashboard Key Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | Application entry point |
| `src/App.tsx` | Router and route definitions |
| `src/contexts/AuthContext.tsx` | Authentication state management |
| `src/lib/firebase.ts` | Firebase initialization |
| `src/lib/workflow-state-machine.ts` | Church approval workflow logic |
| `src/services/churchService.ts` | Church CRUD operations |
| `src/services/uploadService.ts` | Image upload handling |
| `src/pages/TagbilaranDashboard.tsx` | Tagbilaran Chancery dashboard |
| `src/pages/ParishDashboard.tsx` | Parish Secretary dashboard |
| `src/components/ProtectedRoute.tsx` | Route access control |
| `firestore.rules` | Database security rules |
| `storage.rules` | Storage security rules |

### Mobile App Key Files

| File | Purpose |
|------|---------|
| `lib/main.dart` | Application entry point and provider setup |
| `lib/models/app_state.dart` | User visit tracking state |
| `lib/models/church.dart` | Church data model |
| `lib/repositories/firestore_church_repository.dart` | Firebase data access |
| `lib/services/visitor_validation_service.dart` | GPS proximity validation |
| `lib/services/auth_service.dart` | Authentication handling |
| `lib/screens/home_screen.dart` | Main church browsing screen |
| `lib/screens/church_detail_screen.dart` | Individual church view |
| `lib/screens/map_screen.dart` | Interactive map |
| `lib/theme/app_theme.dart` | App styling |

### Configuration Files

| File | Purpose |
|------|---------|
| `admin-dashboard/vite.config.ts` | Vite build configuration |
| `admin-dashboard/tailwind.config.ts` | Tailwind CSS configuration |
| `admin-dashboard/firebase.json` | Firebase hosting configuration |
| `mobile-app/pubspec.yaml` | Flutter dependencies |
| `mobile-app/firebase_options.dart` | Firebase configuration for mobile |

---

## Summary

The VISITA system is built with modern best practices:

1. **Separation of Concerns**: UI, business logic, and data access are in separate layers
2. **Type Safety**: TypeScript (admin) and Dart (mobile) provide compile-time error catching
3. **Role-Based Security**: Multi-layer access control (Firebase rules + app-level checks)
4. **Data Isolation**: Diocese filtering prevents cross-diocese data leakage
5. **Workflow Management**: State machine pattern ensures proper approval flow
6. **Real-time Updates**: Firebase provides live data synchronization
7. **Offline Support**: Mobile app can function with cached data
8. **Scalable Architecture**: Service/repository patterns allow easy testing and modification

---

*Document last updated: December 2025*
