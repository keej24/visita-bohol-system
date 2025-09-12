// Clear existing accounts script
import { auth } from './firebase';
import { deleteUser, signInWithEmailAndPassword } from 'firebase/auth';

const accountsToDelete = [
  'dioceseoftagbilaran1941@gmail.com',
  'talibonchancery@gmail.com', 
  'researcher.heritage@museum.ph'
];

export const clearExistingAccounts = async () => {
  console.log('🧹 Clearing existing accounts...');
  
  for (const email of accountsToDelete) {
    try {
      // Note: This won't work in client-side code due to Firebase security
      // You'll need to manually delete from Firebase Console
      console.log(`Would delete: ${email}`);
    } catch (error) {
      console.log(`Account ${email} might not exist or can't be deleted from client`);
    }
  }
  
  console.log('⚠️ To properly clear accounts, go to Firebase Console:');
  console.log('1. Go to Authentication > Users');
  console.log('2. Delete existing users manually');
  console.log('3. Go to Firestore Database and delete user documents');
};
