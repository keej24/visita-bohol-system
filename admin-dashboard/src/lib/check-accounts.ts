// Check existing accounts and create missing Firestore profiles
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const accountsToCheck = [
  {
    email: 'dioceseoftagbilaran1941@gmail.com',
    password: 'ChanceryTagbilaran2025!',
    profile: {
      role: 'chancery_office',
      name: 'Tagbilaran Chancery Administrator',
      diocese: 'tagbilaran',
      createdAt: new Date(),
      isPreConfigured: true,
      permissions: ['manage_users', 'approve_churches', 'generate_reports', 'moderate_feedback']
    }
  },
  {
    email: 'talibonchancery@gmail.com',
    password: 'ChanceryTalibon2025!',
    profile: {
      role: 'chancery_office',
      name: 'Talibon Chancery Administrator',
      diocese: 'talibon',
      createdAt: new Date(),
      isPreConfigured: true,
      permissions: ['manage_users', 'approve_churches', 'generate_reports', 'moderate_feedback']
    }
  },
  {
    email: 'researcher.heritage@museum.ph',
    password: 'HeritageResearcher2024!',
    profile: {
      role: 'museum_researcher',
      name: 'Heritage Validation Specialist',
      diocese: 'tagbilaran',
      createdAt: new Date(),
      isPreConfigured: true,
      permissions: ['validate_heritage', 'enhance_cultural_content', 'cross_diocese_access']
    }
  }
];

export const checkAndFixAccounts = async () => {
  console.log('🔍 Checking existing accounts and fixing profiles...');
  
  const results = [];
  
  for (const account of accountsToCheck) {
    try {
      console.log(`Checking account: ${account.email}`);
      
      // Try to login
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        account.email, 
        account.password
      );
      
      const user = userCredential.user;
      console.log(`✅ Login successful for ${account.email}`);
      
      // Check if profile exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log(`📝 Creating missing profile for ${account.email}`);
        
        // Create the missing profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          ...account.profile
        });
        
        console.log(`✅ Profile created for ${account.email}`);
        
        results.push({
          success: true,
          email: account.email,
          uid: user.uid,
          action: 'profile_created',
          role: account.profile.role,
          diocese: account.profile.diocese
        });
      } else {
        console.log(`✅ Profile already exists for ${account.email}`);
        const existingData = userDoc.data();
        
        results.push({
          success: true,
          email: account.email,
          uid: user.uid,
          action: 'profile_exists',
          role: existingData.role,
          diocese: existingData.diocese
        });
      }
      
      // Sign out after checking
      await signOut(auth);
      
    } catch (error) {
      console.error(`❌ Error checking account ${account.email}:`, error);
      results.push({
        success: false,
        email: account.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'failed'
      });
    }
  }
  
  return results;
};

export const testAccountLogin = async (email: string, password: string) => {
  try {
    console.log(`🔐 Testing login for: ${email}`);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const profile = userDoc.exists() ? userDoc.data() : null;
    
    console.log('✅ Login successful!');
    console.log('👤 User:', { uid: user.uid, email: user.email });
    console.log('📋 Profile:', profile);
    
    return { 
      success: true, 
      user: { uid: user.uid, email: user.email }, 
      profile,
      hasProfile: !!profile
    };
  } catch (error) {
    console.error('❌ Login failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
