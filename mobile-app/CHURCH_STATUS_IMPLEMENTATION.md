// CHURCH STATUS FILTERING IMPLEMENTATION SUMMARY
// ================================================
//
// This implementation ensures only APPROVED churches are visible to public users
// through a multi-layered filtering approach:
//
// 1. FIRESTORE REPOSITORY LEVEL (lib/repositories/firestore_church_repository.dart)
//    - All queries use .where('status', isEqualTo: 'approved')
//    - streamAll(), getAllOnce(), getAll() methods filter at database level
//    - Only approved churches are fetched from Firestore
//
// 2. CHURCH MODEL LEVEL (lib/models/church.dart)
//    - Added 'status' field with default 'approved' for backward compatibility
//    - Added utility methods: isPublicVisible, requiresAdminAction, etc.
//    - Status constants defined in church_status.dart
//
// 3. SERVICE LEVEL (lib/services/enhanced_church_service.dart)
//    - Additional filtering: churches.where((church) => church.isPublicVisible)
//    - Double-check at service level for extra security
//
// 4. CHURCH STATUS WORKFLOW:
//    - 'pending': Parish Secretary creates entry, hidden from public
//    - 'approved': Chancery Office approves, visible to public ✅
//    - 'revisions': Chancery requests changes, hidden from public
//    - 'heritage_review': Museum Researcher reviewing, hidden from public
//
// 5. IMPLEMENTATION BENEFITS:
//    - Database-level filtering (efficient, secure)
//    - No code changes needed in UI components
//    - Backward compatible with existing data
//    - Easy to extend for admin dashboards
//
// 6. TESTING:
//    - Run setup_churches_with_status.dart to add sample data
//    - Only churches with status='approved' will appear in public app
//    - Admin dashboard can query all statuses using repository methods
//
// 7. SECURITY NOTES:
//    - Firestore security rules should also enforce status filtering
//    - Public users cannot access non-approved churches at database level
//    - Multiple layers of defense against unauthorized access

/* EXAMPLE FIRESTORE SECURITY RULES:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public users can only read approved churches
    match /churches/{churchId} {
      allow read: if resource.data.status == 'approved';
      
      // Parish Secretaries can create with pending status
      allow create: if request.auth != null 
        && hasRole('parish_secretary')
        && request.resource.data.status == 'pending';
      
      // Chancery Office can update status
      allow update: if request.auth != null 
        && hasRole('chancery_office');
    }
    
    function hasRole(role) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
  }
}
*/

// QUERY EXAMPLES:
// ===============
//
// PUBLIC APP (automatically filtered):
// final churches = await churchRepository.getAll();
// // Returns only approved churches
//
// ADMIN DASHBOARD (access all statuses):
// final pendingChurches = await churchRepository.getPendingChurches();
// final revisionChurches = await churchRepository.getRevisionChurches();
// final heritageReviewChurches = await churchRepository.getHeritageReviewChurches();
//
// REAL-TIME ADMIN UPDATES:
// Stream<List<Church>> pendingStream = churchRepository.streamChurchesByStatus('pending');
