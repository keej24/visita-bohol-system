// Firebase Admin Setup Script for Pre-configured Accounts
// Run this script once to create pre-configured accounts for Chancery Office and Museum Researchers

import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Pre-configured accounts data
// Passwords are loaded from environment variables for security
const preConfiguredAccounts = [
  // Chancery Office - Diocese of Tagbilaran
  {
    email: 'dioceseoftagbilaran1941@gmail.com',
    password: import.meta.env.VITE_DEFAULT_PASSWORD_TAGBILARAN || 'ChanceryTagbilaran2025!',
    profile: {
      role: 'chancery_office',
      name: 'Tagbilaran Chancery Administrator',
      diocese: 'tagbilaran',
      createdAt: new Date(),
      isPreConfigured: true,
      permissions: ['manage_users', 'approve_churches', 'generate_reports', 'moderate_feedback']
    }
  },
  // Chancery Office - Diocese of Talibon
  {
    email: 'talibonchancery@gmail.com',
    password: import.meta.env.VITE_DEFAULT_PASSWORD_TALIBON || 'ChanceryTalibon2025!',
    profile: {
      role: 'chancery_office',
      name: 'Talibon Chancery Administrator',
      diocese: 'talibon',
      createdAt: new Date(),
      isPreConfigured: true,
      permissions: ['manage_users', 'approve_churches', 'generate_reports', 'moderate_feedback']
    }
  },
  // Museum Researcher - Cross Diocese
  {
    email: 'bohol@nationalmuseum.gov.ph',
    password: import.meta.env.VITE_DEFAULT_PASSWORD_HERITAGE || 'HeritageResearcher2025!',
    profile: {
      role: 'museum_researcher',
      name: 'Heritage Validation Specialist',
      diocese: 'tagbilaran', // Primary affiliation but has cross-diocese access
      createdAt: new Date(),
      isPreConfigured: true,
      permissions: ['validate_heritage', 'enhance_cultural_content', 'cross_diocese_access']
    }
  }
];

// Function to create pre-configured accounts
export const createPreConfiguredAccounts = async () => {
  console.log('🔧 Creating pre-configured accounts...');
  
  const results = [];
  
  for (const account of preConfiguredAccounts) {
    try {
      console.log(`Creating account for: ${account.email}`);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        account.email, 
        account.password
      );
      
      const user = userCredential.user;
      
      // Create user profile document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        ...account.profile
      });
      
      results.push({
        success: true,
        email: account.email,
        uid: user.uid,
        role: account.profile.role,
        diocese: account.profile.diocese
      });
      
      console.log(`✅ Successfully created account for ${account.email}`);
      
    } catch (error) {
      console.error(`❌ Error creating account for ${account.email}:`, error);
      results.push({
        success: false,
        email: account.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
};

// Test login function for verification
export const testLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch user profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const profile = userDoc.exists() ? userDoc.data() : null;
    
    console.log('✅ Login successful for:', email);
    console.log('Profile:', profile);
    
    return { success: true, user, profile };
  } catch (error) {
    console.error('❌ Login failed for:', email, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Example usage (uncomment to run):
/*
(async () => {
  const results = await createPreConfiguredAccounts();
  console.log('Account creation results:', results);
  
  // Test login for one account
  await testLogin('dioceseoftagbilaran1941@gmail.com', 'ChanceryTagbilaran2025!');
})();
*/


