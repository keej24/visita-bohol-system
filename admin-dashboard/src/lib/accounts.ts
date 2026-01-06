import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, setPersistence, inMemoryPersistence, signOut, sendPasswordResetEmail, type UserCredential } from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase';

// Create a secondary Firebase app to perform privileged-like client actions (user creation)
// without disturbing the current session in the primary app.
let secondaryApp: ReturnType<typeof initializeApp> | null = null;

function getSecondaryAuth() {
  if (!secondaryApp) {
    // Ensure unique name for secondary app
    const name = 'secondary-admin';
    const existing = getApps().find(a => a.name === name);
    secondaryApp = existing ?? initializeApp(firebaseConfig, name);
  }
  const secondaryAuth = getAuth(secondaryApp);
  return secondaryAuth;
}

export async function createAuthUserWithoutAffectingSession(email: string, password: string): Promise<UserCredential> {
  const auth2 = getSecondaryAuth();
  // Do not persist the secondary session to storage
  await setPersistence(auth2, inMemoryPersistence);
  const cred = await createUserWithEmailAndPassword(auth2, email, password);
  // Sign out from the secondary auth to clean up
  await signOut(auth2).catch(() => {});
  return cred;
}

/**
 * Create a new user and send password reset email
 * This allows the user to set their own password AND verifies their email
 * Returns the user credential after sending password reset email
 */
export async function createAuthUserAndSendPasswordReset(email: string): Promise<UserCredential> {
  const auth2 = getSecondaryAuth();
  // Do not persist the secondary session to storage
  await setPersistence(auth2, inMemoryPersistence);
  
  // Generate a random password (user will never see this)
  const tempPassword = generateTempPassword(24);
  const cred = await createUserWithEmailAndPassword(auth2, email, tempPassword);
  
  // Sign out from the secondary auth to clean up
  await signOut(auth2).catch(() => {});
  
  // Send password reset email using the main auth (doesn't require being signed in)
  try {
    const mainAuth = getAuth();
    await sendPasswordResetEmail(mainAuth, email);
    console.log('✅ Password reset email sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    // Don't throw - account is created, just email failed
  }
  
  return cred;
}

export function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

