// Setup script for Museum Researcher account
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const museumResearcherAccount = {
  email: 'researcher.heritage@museum.ph',
  password: 'HeritageResearcher2025!',
  profile: {
    role: 'museum_researcher',
    name: 'Heritage Validation Specialist',
    diocese: 'tagbilaran', // Primary affiliation but has cross-diocese access
    createdAt: new Date(),
    isPreConfigured: true,
    permissions: ['validate_heritage', 'enhance_cultural_content', 'cross_diocese_access']
  }
};

export const setupMuseumResearcher = async () => {
  console.log('🏛️ Setting up Museum Researcher account...');
  
  try {
    // Check if account already exists
    try {
      console.log('Checking if account exists...');
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        museumResearcherAccount.email, 
        museumResearcherAccount.password
      );
      
      const user = userCredential.user;
      console.log('✅ Account exists, checking profile...');
      
      // Check if profile exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        console.log('✅ Profile exists:', userDoc.data());
        await auth.signOut();
        return { success: true, message: 'Museum Researcher account already exists and is properly configured' };
      } else {
        console.log('Creating missing profile...');
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          ...museumResearcherAccount.profile
        });
        console.log('✅ Profile created successfully');
        await auth.signOut();
        return { success: true, message: 'Museum Researcher profile created successfully' };
      }
      
    } catch (loginError) {
      console.log('Account does not exist, creating new account...');
      
      // Create new account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        museumResearcherAccount.email,
        museumResearcherAccount.password
      );
      
      const user = userCredential.user;
      console.log('✅ Account created:', user.email);
      
      // Create Firestore profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        ...museumResearcherAccount.profile
      });
      
      console.log('✅ Profile created successfully');
      await auth.signOut();
      
      return { 
        success: true, 
        message: 'Museum Researcher account and profile created successfully',
        credentials: {
          email: museumResearcherAccount.email,
          password: museumResearcherAccount.password
        }
      };
    }
    
  } catch (error) {
    console.error('❌ Error setting up Museum Researcher account:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Run if called directly
if (typeof window === 'undefined') {
  setupMuseumResearcher().then(result => {
    console.log('Setup Result:', result);
  });
}