# VISITA Defense Preparation Study Plan

**Student**: Kejay  
**Defense Date**: TBD  
**System**: VISITA Bohol Churches Information System  
**Last Updated**: November 15, 2025

---

## 📚 Study Plan Overview

This guide provides a structured approach to studying your capstone project for defense. Follow this sequence for maximum comprehension and confidence.

---

## 🎯 Phase 1: Foundation (Day 1-2) - Core Understanding

### Step 1: Start with the Big Picture (30 minutes)
**Read First**: `DEFENSE_STUDY_GUIDE.md` - Introduction Section (Lines 1-150)

**Focus Areas**:
- Project title and objectives
- Problem statement: Why does Bohol need this system?
- Target users: 4 roles (Chancery, Museum Researcher, Parish, Public)
- Two main components: Mobile App + Admin Dashboard

**Self-Quiz**:
- [ ] Can you explain the project in 2 minutes to a non-technical person?
- [ ] Can you name all 4 user roles and their main functions?
- [ ] What problem does this system solve?

---

### Step 2: Understand the Architecture (1 hour)
**Read**: `admin-dashboard/CLAUDE.md` - Architecture Section

**Key Concepts to Master**:
1. **Monorepo Structure**: Why one repository with two apps?
2. **Firebase Backend**: 
   - Firestore (database)
   - Authentication (login system)
   - Storage (images/files)
3. **Technology Stack**:
   - Admin Dashboard: React + TypeScript + Vite
   - Mobile App: Flutter + Dart
   - Backend: Firebase (no custom server needed)

**Diagram Exercise**: Draw the system architecture on paper:
```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Mobile App     │ ←────→  │   Firebase   │ ←────→  │ Admin Dashboard │
│  (Flutter)      │         │   Backend    │         │  (React)        │
└─────────────────┘         └──────────────┘         └─────────────────┘
     Public Users           Firestore/Auth/Storage      Admin Users
```

**Self-Quiz**:
- [ ] Why did you choose Firebase instead of building a custom backend?
- [ ] What are the advantages of a monorepo structure?
- [ ] What does "offline-first" mean for the mobile app?

---

### Step 3: Master the Data Model (1 hour)
**Read**: `DEFENSE_STUDY_GUIDE.md` - Database Schema Section (Lines ~450-600)

**Critical Collections**:
1. **churches** - Main data (name, location, heritage, status)
2. **users** - Admin profiles (role, diocese, parish)
3. **pub_users** - Public user profiles (mobile app users)
4. **announcements** - Diocese and parish announcements
5. **feedback** - User reviews and ratings
6. **visitor_logs** - Visit tracking with location validation

**Hands-On Exercise**:
Open Firebase Console → Firestore → Explore each collection
- Look at actual document structure
- Note required vs optional fields
- Understand relationships (e.g., feedback → church)

**Self-Quiz**:
- [ ] What fields are in the `churches` collection?
- [ ] How do you know which diocese a church belongs to?
- [ ] What's the difference between `users` and `pub_users`?

---

## 🔐 Phase 2: Security & Access Control (Day 2-3)

### Step 4: Role-Based Access Control (2 hours)
**Read**: 
1. `DEFENSE_STUDY_GUIDE.md` - Authentication & Authorization (Lines ~700-900)
2. `admin-dashboard/firestore.rules` - Security Rules File

**The 4-Role Hierarchy**:

| Role | Diocese | Parish | Permissions |
|------|---------|--------|-------------|
| **Chancery Office** | ✅ Own | ❌ All | Manage all churches in diocese, create users, final approval |
| **Museum Researcher** | ❌ N/A | ❌ N/A | Validate ICP/NCT heritage churches (both dioceses) |
| **Parish Secretary** | ✅ Own | ✅ Own | Manage assigned church only |
| **Public User** | ❌ N/A | ❌ N/A | Browse, feedback, track visits (mobile only) |

**Critical Concept**: **Diocese Isolation**
- Tagbilaran users can only see Tagbilaran data
- Talibon users can only see Talibon data
- Museum Researcher is exception (sees both for heritage validation)

**Firestore Rules Deep Dive**:
```javascript
// Example: Church read rule
allow read: if request.auth != null && 
  resource.data.diocese == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.diocese;
```

**Self-Quiz**:
- [ ] Can a Tagbilaran parish secretary edit a Talibon church? (No)
- [ ] Can a museum researcher see churches from both dioceses? (Yes)
- [ ] What happens if a user tries to access data from wrong diocese? (Firestore denies request)

---

### Step 5: Church Approval Workflow (1.5 hours)
**Read**: `DEFENSE_STUDY_GUIDE.md` - Church Management Workflow (Lines ~1000-1200)

**The 5-State Machine**:
```
1. pending → pending_review (Parish submits)
2. pending_review → approved (Chancery approves non-heritage)
3. pending_review → heritage_review (Chancery sends to Museum)
4. heritage_review → approved (Museum validates)
5. approved → heritage_review (Chancery re-submits for validation)
```

**Heritage Detection Logic**:
```typescript
// Simple binary check (NOT weighted scoring)
function needsHeritageReview(church) {
  return church.heritageClassification === 'icp' || 
         church.heritageClassification === 'nct';
}
```

**Important**: Guide previously said "weighted algorithm" - this was **corrected** to simple binary check.

**Self-Quiz**:
- [ ] What are the 6 TypeScript statuses? (pending, pending_review, approved, rejected, archived, heritage_review)
- [ ] Why are only 5 transitions implemented? (heritage_review status exists but not in TypeScript type)
- [ ] When does a church go to Museum Researcher? (Only if ICP or NCT)

---

## 💻 Phase 3: Technical Implementation (Day 3-4)

### Step 6: Admin Dashboard Code Structure (2 hours)
**Read**: `admin-dashboard/CLAUDE.md` - Component Architecture

**Key Folders**:
```
admin-dashboard/src/
├── pages/              # Main route pages
│   ├── TagbilaranDashboard.tsx
│   ├── ParishDashboard.tsx
│   └── Feedback.tsx
├── components/         # Reusable components
│   ├── ui/            # shadcn/ui primitives (DON'T edit directly)
│   └── parish/        # Parish-specific components
├── contexts/          # React Context (AuthContext, AppStateProvider)
├── lib/               # Utilities, Firebase config
├── services/          # Business logic (FeedbackService, uploadService)
└── types/             # TypeScript type definitions
```

**Hands-On Exercise**:
1. Open `admin-dashboard/src/contexts/AuthContext.tsx`
2. Find the `UserRole` type definition
3. Trace how it's used in components

**Self-Quiz**:
- [ ] Where is Firebase initialized? (lib/firebase.ts)
- [ ] Where is role-based access control implemented? (AuthContext.tsx)
- [ ] What's the difference between `pages/` and `components/`?

---

### Step 7: Mobile App Code Structure (2 hours)
**Read**: `mobile-app/README.md` (if exists) or explore code

**Key Folders**:
```
mobile-app/lib/
├── screens/           # UI screens
│   ├── home_screen.dart
│   ├── church_detail_screen_modern.dart
│   └── feedback_submit_screen.dart
├── models/            # Data models
│   ├── church.dart
│   ├── app_state.dart
│   └── feedback.dart
├── services/          # Business logic
│   ├── auth_service.dart
│   ├── profile_service.dart
│   └── feedback_service.dart
├── repositories/      # Data access layer
│   ├── firestore_church_repository.dart
│   └── church_repository.dart (base class)
└── widgets/           # Reusable UI components
```

**Important Architecture Pattern**: Provider Pattern
```dart
// AppState manages visit tracking
class AppState extends ChangeNotifier {
  List<Church> _visited = [];
  List<Church> _forVisit = [];
  
  // Notifies UI when data changes
  markVisited(Church church) {
    _visited.add(church);
    notifyListeners(); // UI updates automatically
  }
}
```

**Self-Quiz**:
- [ ] What state management does mobile use? (Provider pattern)
- [ ] Where is Firebase data fetched? (repositories/)
- [ ] What's the difference between `visited` and `forVisit`?

---

### Step 8: Key Features Deep Dive (2 hours each)

#### Feature 1: Location-Based Visit Validation
**Read**: `mobile-app/lib/services/visitor_validation_service.dart`

**How It Works**:
1. User taps "Mark as Visited" button
2. App gets GPS location (geolocator package)
3. Calculates distance using Haversine formula
4. Validates within 500m radius of church
5. If valid → Records visit in Firestore `visitor_logs`
6. If invalid → Shows error with distance

**Code Flow**:
```dart
markVisitedWithValidation() 
  → VisitorValidationService.validateProximity()
    → Calculate distance using Haversine
    → If < 500m: valid
  → If valid: VisitorLogService.logVisit()
    → Save to Firestore visitor_logs collection
  → Update AppState (visited list)
  → Sync with ProfileService (user profile)
```

**Defense Question Prep**:
- Q: "Why 500 meters?"
- A: "Balance between accuracy and user convenience. Some churches have large compounds, and GPS can have 10-20m accuracy variance."

---

#### Feature 2: Feedback System (Post-Moderation)
**Read**: `FEEDBACK_VISIBILITY_CONSISTENCY_REPORT.md`

**Critical Understanding**: **Auto-Publish, Then Moderate**
```
User submits feedback → Status: 'published' (visible immediately)
                      ↓
Admin can hide it     → Status: 'hidden' (removed from public view)
                      ↓
Admin can unhide it   → Status: 'published' (visible again)
```

**NOT Pre-Moderation**: Feedback does NOT need approval before showing.

**Both Dashboards Use Same Service**:
- Parish Dashboard: `ParishFeedback.tsx` → `FeedbackService.moderateFeedback()`
- Chancery Dashboard: `Feedback.tsx` → `FeedbackService.moderateFeedback()`
- Mobile App: Queries only `status == 'published'`

**Data Consistency**:
- ✅ Both write to same Firestore collection
- ✅ Changes are immediate in database
- ⚠️ Parish sees changes instantly (real-time listener)
- ⚠️ Chancery needs page refresh (one-time fetch)

**Defense Question Prep**:
- Q: "What if parish hides feedback, does chancery see it hidden?"
- A: "Yes, both update the same Firestore document. Parish sees change instantly due to real-time listener. Chancery sees it after page refresh."

---

#### Feature 3: 360° Virtual Tours
**Read**: `admin-dashboard/360_PHOTO_INTEGRATION_ANALYSIS.md`

**Technology**: Pannellum.js library

**Admin Upload Flow**:
1. Chancery uploads 360° photo (2:1 aspect ratio required)
2. Stored in Firebase Storage: `/churches/{churchId}/360/`
3. URL saved in Firestore `churches` collection → `virtualTour.photo360Urls` array
4. Admin can preview before saving

**Mobile Display Flow**:
1. User taps "360° Tour" button
2. App generates HTML with Pannellum CDN
3. Uses `flutter_inappwebview` to display WebView
4. User can pan/zoom in 360° environment

**Defense Question Prep**:
- Q: "Why use WebView instead of native 360° viewer?"
- A: "Pannellum is battle-tested, cross-platform (web + mobile), and handles equirectangular projection calculations. Building native would require complex 3D rendering."

---

## 🎓 Phase 4: Defense Scenarios (Day 4-5)

### Step 9: Common Defense Questions

#### **Technical Questions**

**Q1: Why did you choose Firebase over a traditional backend?**
**A**: 
- **Rapid Development**: No server setup, authentication built-in
- **Real-time**: Firestore provides live updates (chat-like experience)
- **Scalability**: Google infrastructure handles scaling automatically
- **Cost-Effective**: Free tier generous, pay-as-you-grow
- **Security**: Declarative rules prevent unauthorized access
- **Offline**: Automatic 40MB cache on mobile

**Q2: How do you prevent SQL injection?**
**A**: 
- "We use Firestore (NoSQL), not SQL, so SQL injection doesn't apply."
- "Firestore security rules validate all requests on server side."
- "Even if client is compromised, malicious queries are rejected by Firebase."

**Q3: What if two admins edit the same church simultaneously?**
**A**: 
- "Firestore uses last-write-wins by default."
- "For critical operations, we could implement optimistic locking with transactions."
- "In practice, parish secretaries manage their own churches, reducing conflicts."

**Q4: How do you handle offline mode in mobile app?**
**A**: 
- "Firestore automatically caches 40MB of data on device."
- "User can browse cached churches without internet."
- "Visit tracking requires GPS + internet to validate location and log to server."
- "SharedPreferences stores user preferences offline."

**Q5: Why not use MySQL/PostgreSQL?**
**A**: 
- "Traditional SQL requires server maintenance, backup management, scaling concerns."
- "Firestore gives us: automatic backups, zero maintenance, real-time sync, global CDN."
- "For a 2-person team with limited time, Firebase lets us focus on features, not infrastructure."

---

#### **Business Logic Questions**

**Q6: What happens if GPS is inaccurate?**
**A**: 
- "We use 500m radius tolerance (not strict 10m)."
- "If validation fails, we show actual distance to user."
- "User can contact admin to manually verify visit if needed."
- "Future enhancement: Allow manual admin override for special cases."

**Q7: Why separate Tagbilaran and Talibon dioceses?**
**A**: 
- "Organizational structure: Catholic Church has diocese boundaries."
- "Each diocese has independent administration."
- "Data isolation prevents accidental cross-diocese editing."
- "Diocese filter improves query performance (smaller result sets)."

**Q8: What if a heritage church is wrongly classified?**
**A**: 
- "Museum Researcher role specifically validates ICP/NCT classifications."
- "Chancery can re-submit approved churches back to Museum for re-validation."
- "Workflow state machine has `approved → heritage_review` transition for corrections."

---

#### **Design Decisions Questions**

**Q9: Why React for admin, Flutter for mobile?**
**A**: 
- **React**: 
  - Web-first, accessible from any browser
  - Rich UI library (shadcn/ui)
  - TypeScript for type safety
- **Flutter**: 
  - Native mobile performance
  - Single codebase for iOS + Android
  - Beautiful material design out of the box
  - Offline capabilities superior to web

**Q10: Why post-moderation instead of pre-moderation for feedback?**
**A**: 
- "Better user experience: instant feedback submission."
- "Low abuse risk in religious context (church visitors are respectful)."
- "Admin can quickly hide inappropriate content (rare occurrence)."
- "Encourages more reviews (no waiting period)."

---

### Step 10: Demo Preparation (2 hours)

**Create a Demo Script**:

**Scenario 1: Admin Workflow (15 minutes)**
```
1. Login as Chancery Office
2. Show Dashboard (stats, pending churches)
3. Review a pending church submission
   - Check heritage classification
   - Send to Museum if ICP/NCT
   - Approve if non-heritage
4. Create diocese announcement
5. View feedback for a church
6. Moderate inappropriate feedback (hide it)
7. Show visitor analytics
```

**Scenario 2: Mobile Workflow (10 minutes)**
```
1. Open mobile app (logged out state)
2. Browse churches as guest
3. Filter by heritage classification
4. View church detail (photos, history, 360° tour)
5. Try to mark visited (requires login)
6. Login/Register
7. Mark visited with location validation
   - Show success when near church
   - Show error when far away
8. Add to "For Visit" list
9. Submit feedback with photos
10. View personal profile (visited churches, stats)
```

**Practice Tips**:
- [ ] Run through demo 5+ times until smooth
- [ ] Prepare backup plan if internet fails (show screenshots)
- [ ] Have Firebase Console open in another tab (show database)
- [ ] Clear test data before defense (use production-like data)

---

## 📋 Phase 5: Final Review (Day Before Defense)

### Step 11: Quick Reference Checklist

**Read**: `DEFENSE_DAY_QUICK_REFERENCE.md`

**The Night Before**:
- [ ] Re-read DEFENSE_STUDY_GUIDE.md (focus on corrections)
- [ ] Review DEFENSE_GUIDE_CORRECTIONS_SUMMARY.md
- [ ] Test demo scenarios 2-3 times
- [ ] Charge laptop fully
- [ ] Backup demo video (in case live demo fails)
- [ ] Print system architecture diagram
- [ ] Prepare Firebase Console bookmarks

**System Health Check**:
```bash
# Admin Dashboard
cd admin-dashboard
npm run dev

# Mobile App  
cd mobile-app
flutter run

# Check Firebase
# Open Firebase Console → Check all services online
```

---

## 🎯 Confidence Builders

### Things You Did Really Well

1. **Comprehensive Documentation**: You have excellent markdown files covering every aspect
2. **Real-World Problem**: Addresses actual need in Bohol heritage preservation
3. **Modern Tech Stack**: Firebase, React, Flutter are industry-standard
4. **Security-First**: Role-based access, diocese isolation, Firestore rules
5. **User-Centered Design**: Offline mode, location validation, 360° tours

### If Panelists Ask "Why Not..."

**"Why not use Laravel/Django?"**
- "Traditional frameworks require server hosting, SSL certificates, database management."
- "Firebase eliminates ~80% of backend complexity, letting us focus on user features."

**"Why not native Android (Java) + native iOS (Swift)?"**
- "Flutter gives us both platforms from one codebase."
- "Development time cut in half, consistent UX across platforms."

**"Why not build your own authentication?"**
- "Security is hard. Firebase Auth is battle-tested, handles password hashing, session management, OAuth."
- "Building custom auth risks security vulnerabilities."

---

## 🚀 Day of Defense Strategy

### Before You Present

1. **Arrive Early**: Test projector, Wi-Fi, demo app
2. **Calm Nerves**: You know this system inside-out. You built it.
3. **Have Water**: You'll be talking a lot

### During Presentation

**Opening (2 minutes)**:
- "Good morning. I'm Kejay, presenting VISITA: Bohol Churches Information System."
- "This system digitizes heritage church information for Tagbilaran and Talibon dioceses."
- "Two main components: Mobile app for public users, admin dashboard for church administrators."

**Architecture Overview (3 minutes)**:
- Show system diagram
- Explain Firebase backend choice
- Mention 4 user roles

**Live Demo (20 minutes)**:
- Admin workflow first (more complex)
- Mobile workflow second (user-friendly)
- Highlight unique features: location validation, 360° tours, feedback moderation

**Q&A Strategy**:
- **Listen Fully**: Don't interrupt panelist
- **Pause Before Answering**: Think 2-3 seconds
- **Be Honest**: If you don't know, say "That's outside the scope, but I could research it"
- **Reference Documentation**: "As detailed in my defense guide, page X..."

### If Demo Fails

**Backup Plan**:
1. Show screenshots/video recording
2. Open Firebase Console to show database
3. Walk through code in VS Code
4. Explain what SHOULD have happened

---

## 📚 Essential Reading Order (Prioritized)

**Must Read (Day 1-2)**:
1. ✅ `DEFENSE_STUDY_GUIDE.md` (Main document, 3000+ lines)
2. ✅ `DEFENSE_GUIDE_CORRECTIONS_SUMMARY.md` (Critical fixes)
3. ✅ `admin-dashboard/CLAUDE.md` (Architecture deep-dive)

**Should Read (Day 2-3)**:
4. ✅ `FEEDBACK_VISIBILITY_CONSISTENCY_REPORT.md`
5. ✅ `admin-dashboard/360_PHOTO_INTEGRATION_ANALYSIS.md`
6. ✅ `FOR_VISIT_BUTTON_FIX_SUMMARY.md`

**Optional (If Time)**:
7. `CHURCH_DETAIL_ENHANCED_IMPLEMENTATION.md`
8. `PARISH_DASHBOARD_IMPROVEMENTS.md`
9. `FIREBASE_SECURITY.md`

---

## 🎓 Your Strengths to Emphasize

1. **Problem-Solving**: You identified real gap in Bohol heritage management
2. **Technical Depth**: Modern stack, security-first design, scalable architecture
3. **User Experience**: Offline mode, location validation, intuitive UI
4. **Documentation**: Comprehensive guides (panelists will notice)
5. **Iteration**: You fixed bugs, improved features (show commit history)

---

## 💪 Final Pep Talk

You've built a **production-ready system** that solves a **real problem** for **real users** in Bohol. 

You understand:
- ✅ The business logic (workflows, roles, permissions)
- ✅ The technical implementation (React, Flutter, Firebase)
- ✅ The security model (Firestore rules, diocese isolation)
- ✅ The user experience (mobile-first, offline, location-based)

**You got this!** 🚀

The panelists want to see:
1. You understand what you built
2. You can explain why you made design decisions
3. You can demo the system working
4. You can answer questions confidently

All four? ✅ You're prepared.

---

## 📞 Emergency Contacts (Day of Defense)

- **Thesis Adviser**: [Contact Info]
- **Technical Support**: [IT Contact]
- **Panel Secretary**: [Contact Info]

---

## ✅ Pre-Defense Checklist

**1 Week Before**:
- [ ] Read all essential documentation
- [ ] Practice demo 10+ times
- [ ] Test on different networks (Wi-Fi, mobile hotspot)
- [ ] Verify Firebase services are online
- [ ] Prepare backup demo video

**1 Day Before**:
- [ ] Re-read this study plan
- [ ] Review corrections document
- [ ] Full system health check
- [ ] Charge all devices
- [ ] Print architecture diagrams

**Morning of Defense**:
- [ ] Test demo one final time
- [ ] Verify internet connection
- [ ] Have Firebase Console open
- [ ] Have VS Code ready (backup)
- [ ] Bring charger, mouse, backup laptop

---

**Remember**: You're not just defending a project. You're showcasing a solution to a real problem. The panelists are on your side—they want you to succeed.

**Good luck! You've got this!** 🎉

---

**Last Updated**: November 15, 2025  
**Next Review**: Night before defense  
**Confidence Level**: 🔥🔥🔥🔥🔥 (You're ready!)
