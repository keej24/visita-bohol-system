// Firebase connection test script
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "visitaproject-5cd9f.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "visitaproject-5cd9f",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "visitaproject-5cd9f.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "490423265288",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:490423265288:web:eee490e89f588ff9bfc9bd"
};

console.log('Testing Firebase Configuration...');
console.log('Config:', firebaseConfig);

try {
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');

  // Initialize Auth
  const auth = getAuth(app);
  console.log('✅ Firebase Auth initialized successfully');

  // Initialize Firestore
  const db = getFirestore(app);
  console.log('✅ Firestore initialized successfully');

  // Test auth state
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('✅ User is signed in:', user.email);
    } else {
      console.log('ℹ️  No user is currently signed in');
    }
  });

  console.log('✅ Firebase connection test completed successfully');
  
} catch (error) {
  console.error('❌ Firebase connection test failed:', error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
}