// Test Firestore access and permissions
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export const testFirestoreAccess = async (email: string, password: string) => {
  try {
    console.log('🔐 Testing Firestore access for:', email);
    
    // Login first
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('✅ Login successful, UID:', user.uid);
    
    // Test 1: Try to read own user document
    console.log('📋 Test 1: Reading own user document...');
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        console.log('✅ Own document read successful:', userDoc.data());
      } else {
        console.log('❌ Own document does not exist');
      }
    } catch (error) {
      console.error('❌ Failed to read own document:', error);
    }
    
    // Test 2: Try to list users collection (should fail with proper rules)
    console.log('📋 Test 2: Attempting to list users collection...');
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log('⚠️ Users collection accessible (might be too permissive):', usersSnapshot.size, 'documents');
    } catch (error) {
      console.log('✅ Users collection properly protected:', (error as Error).message);
    }
    
    // Test 3: Try to read another user's document (should fail)
    console.log('📋 Test 3: Attempting to read another user document...');
    try {
      const otherDoc = await getDoc(doc(db, 'users', 'fake-uid-123'));
      if (otherDoc.exists()) {
        console.log('⚠️ Other user document accessible (security issue)');
      } else {
        console.log('✅ Other user document not found (good)');
      }
    } catch (error) {
      console.log('✅ Other user document properly protected:', (error as Error).message);
    }
    
    // Sign out
    await signOut(auth);
    
    return {
      success: true,
      message: 'Firestore access test completed - check console for details'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const checkCurrentFirestoreRules = () => {
  console.log('📋 Current Firestore Rules Status:');
  console.log('To check your current rules:');
  console.log('1. Go to Firebase Console');
  console.log('2. Navigate to Firestore Database → Rules');
  console.log('3. Check if rules allow authenticated users to read their own documents');
  console.log('4. Required rule: allow read, write: if request.auth != null && request.auth.uid == userId;');
};
