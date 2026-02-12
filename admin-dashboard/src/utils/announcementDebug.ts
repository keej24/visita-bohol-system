// Diagnostic utility for debugging announcement creation issues
// Run in browser console: window.debugAnnouncements()

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

export async function debugAnnouncements() {
  console.log('🔍 ===== ANNOUNCEMENT DEBUG TOOL =====');
  console.log('');

  // Step 1: Check Firebase Auth
  console.log('📌 Step 1: Checking Firebase Authentication');
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('❌ No user is currently authenticated');
    console.log('Solution: Please login first');
    return;
  }
  console.log('✅ User authenticated:', {
    uid: currentUser.uid,
    email: currentUser.email,
    emailVerified: currentUser.emailVerified
  });
  console.log('');

  // Step 2: Check User Document in Firestore
  console.log('📌 Step 2: Checking User Document in Firestore');
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error('❌ User document does NOT exist in Firestore');
      console.log('Collection: users');
      console.log('Document ID:', currentUser.uid);
      console.log('');
      console.log('Solution: Create user document with this structure:');
      console.log(JSON.stringify({
        uid: currentUser.uid,
        email: currentUser.email,
        role: 'chancery_office', // or 'parish'
        diocese: 'tagbilaran', // or 'talibon'
        name: 'Your Name',
        createdAt: new Date(),
        lastLogin: new Date()
      }, null, 2));
      return;
    }

    const userData = userDoc.data();
    console.log('✅ User document found:', userData);

    // Validate required fields
    const requiredFields = ['role', 'diocese', 'email'];
    const missingFields = requiredFields.filter(field => !userData[field]);

    if (missingFields.length > 0) {
      console.error('❌ User document is missing required fields:', missingFields);
      console.log('Current data:', userData);
      return;
    }

    console.log('✅ All required fields present');
    console.log('');

    // Step 3: Check Role Permission
    console.log('📌 Step 3: Checking Role Permissions');
    const allowedRoles = ['chancery_office', 'parish'];
    if (!allowedRoles.includes(userData.role)) {
      console.error('❌ User role does not have permission to create announcements');
      console.log('Current role:', userData.role);
      console.log('Allowed roles:', allowedRoles);
      return;
    }
    console.log('✅ User has permission to create announcements');
    console.log('');

    // Step 4: Test Firestore Write Permission
    console.log('📌 Step 4: Testing Firestore Write Permission');
    console.log('Attempting to create test announcement...');

    const testData = {
      title: '[TEST] Debug Announcement',
      description: 'This is a test announcement created by the debug tool',
      scope: userData.role === 'parish' ? 'parish' : 'diocese',
      diocese: userData.diocese,
      parishId: userData.parish || null,
      eventDate: Timestamp.fromDate(new Date()),
      eventTime: '10:00 AM',
      venue: 'Test Venue',
      category: 'general',
      endDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      contactInfo: 'test@example.com',
      createdAt: Timestamp.now(),
      createdBy: currentUser.uid,
      updatedAt: Timestamp.now(),
      isArchived: false,
    };

    console.log('Test data:', testData);

    try {
      const docRef = await addDoc(collection(db, 'announcements'), testData);
      console.log('✅ Test announcement created successfully!');
      console.log('Document ID:', docRef.id);
      console.log('');
      console.log('🎉 All checks passed! Announcement creation should work.');
      console.log('If it still fails in the UI, check:');
      console.log('1. Form validation (check browser console for errors)');
      console.log('2. Date format (ensure dates are valid)');
      console.log('3. Network connectivity');
    } catch (writeError: any) {
      console.error('❌ Failed to create test announcement');
      console.error('Error:', writeError);
      console.log('');

      if (writeError.code === 'permission-denied') {
        console.log('🔐 PERMISSION DENIED ERROR');
        console.log('This means Firestore security rules are blocking the write.');
        console.log('');
        console.log('Possible causes:');
        console.log('1. User document fields do not match security rules');
        console.log('2. Diocese mismatch in security rules');
        console.log('3. Role not recognized by security rules');
        console.log('');
        console.log('Current user data:');
        console.log('  - role:', userData.role);
        console.log('  - diocese:', userData.diocese);
        console.log('  - parish:', userData.parish);
        console.log('');
        console.log('Security rule expects:');
        console.log('  - role: "chancery_office" or "parish"');
        console.log('  - diocese: must match announcement diocese');
        console.log('  - For parish secretary: parish must match parishId');
      } else {
        console.log('Error code:', writeError.code);
        console.log('Error message:', writeError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
  }

  console.log('');
  console.log('🔍 ===== DEBUG COMPLETE =====');
}

// Make it available globally in browser console
if (typeof window !== 'undefined') {
  (window as any).debugAnnouncements = debugAnnouncements;
  console.log('💡 Debug tool loaded! Run: debugAnnouncements()');
}
