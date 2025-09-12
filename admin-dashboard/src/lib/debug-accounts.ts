// Debug script to check account statuses and routing issues
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const testCredentials = [
  {
    name: 'Tagbilaran Chancery',
    email: 'dioceseoftagbilaran1941@gmail.com',
    passwords: ['ChanceryTagbilaran2025!', 'ChanceryTagbilaran2024!'],
    expectedRole: 'chancery_office',
    expectedDiocese: 'tagbilaran'
  },
  {
    name: 'Talibon Chancery',
    email: 'talibonchancery@gmail.com',
    passwords: ['ChanceryTalibon2025!', 'ChanceryTalibon2024!'],
    expectedRole: 'chancery_office',
    expectedDiocese: 'talibon'
  },
  {
    name: 'Museum Researcher',
    email: 'researcher.heritage@museum.ph',
  passwords: ['HeritageResearcher2024!'],
    expectedRole: 'museum_researcher',
    expectedDiocese: 'tagbilaran'
  }
];

export const debugAccountIssues = async () => {
  console.log('🔍 DEBUGGING ACCOUNT AND ROUTING ISSUES');
  console.log('==========================================');
  
  const results = [];
  
  for (const account of testCredentials) {
    console.log(`\n📧 Testing ${account.name} (${account.email})`);
    
    let loginSuccess = false;
    let workingPassword = '';
    let userProfile = null;
    
    // Try different passwords
    for (const password of account.passwords) {
      try {
        console.log(`  🔐 Trying password: ${password}`);
        
        const userCredential = await signInWithEmailAndPassword(auth, account.email, password);
        const user = userCredential.user;
        
        console.log(`  ✅ Login successful with: ${password}`);
        loginSuccess = true;
        workingPassword = password;
        
        // Check Firestore profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          userProfile = userDoc.data();
          console.log(`  📋 Profile found:`, {
            role: userProfile.role,
            diocese: userProfile.diocese,
            name: userProfile.name
          });
        } else {
          console.log(`  ❌ No Firestore profile found for UID: ${user.uid}`);
        }
        
        // Sign out
        await signOut(auth);
        break;
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ❌ Failed with ${password}: ${errorMessage}`);
      }
    }
    
    // Analysis
    const analysis = {
      account: account.name,
      email: account.email,
      canLogin: loginSuccess,
      workingPassword,
      hasFirestoreProfile: !!userProfile,
      profileData: userProfile,
      roleMatch: userProfile?.role === account.expectedRole,
      dioceseMatch: userProfile?.diocese === account.expectedDiocese,
      issues: []
    };
    
    if (!loginSuccess) {
      analysis.issues.push('Cannot login with any password');
    }
    if (loginSuccess && !userProfile) {
      analysis.issues.push('Missing Firestore profile');
    }
    if (userProfile && userProfile.role !== account.expectedRole) {
      analysis.issues.push(`Role mismatch: expected ${account.expectedRole}, got ${userProfile.role}`);
    }
    if (userProfile && userProfile.diocese !== account.expectedDiocese) {
      analysis.issues.push(`Diocese mismatch: expected ${account.expectedDiocese}, got ${userProfile.diocese}`);
    }
    
    results.push(analysis);
    
    console.log(`  📊 Issues found: ${analysis.issues.length === 0 ? 'None' : analysis.issues.join(', ')}`);
  }
  
  console.log('\n🎯 SUMMARY OF ISSUES:');
  console.log('====================');
  
  results.forEach(result => {
    console.log(`\n${result.account}:`);
    if (result.issues.length === 0) {
      console.log('  ✅ No issues found');
    } else {
      result.issues.forEach(issue => console.log(`  ❌ ${issue}`));
    }
  });
  
  return results;
};

export const fixAccountPassword = async (email: string, correctPassword: string) => {
  console.log(`🔧 Note: Cannot change password from client-side.`);
  console.log(`To fix password for ${email}:`);
  console.log('1. Go to Firebase Console → Authentication → Users');
  console.log(`2. Find user with email: ${email}`);
  console.log('3. Click "..." → Reset password');
  console.log(`4. Set new password to: ${correctPassword}`);
  return { message: 'Manual password reset required in Firebase Console' };
};
