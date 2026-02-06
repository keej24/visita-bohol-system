/**
 * Script to check Firebase Auth users
 * Run with: node check-auth-users.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccountPath = path.join(__dirname, '../admin-dashboard/firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error('❌ Could not load service account. Make sure firebase-service-account.json exists.');
  process.exit(1);
}

async function listAuthUsers() {
  console.log('🔍 Listing Firebase Auth users...\n');

  try {
    // List all users (first 1000)
    const listUsersResult = await admin.auth().listUsers(1000);
    
    console.log(`Found ${listUsersResult.users.length} Firebase Auth users:\n`);
    
    // Group by creation time (recent first)
    const users = listUsersResult.users.sort((a, b) => {
      const timeA = new Date(a.metadata.creationTime).getTime();
      const timeB = new Date(b.metadata.creationTime).getTime();
      return timeB - timeA;
    });

    console.log('--- Recent users (last 10) ---');
    users.slice(0, 10).forEach(user => {
      console.log(`  📧 ${user.email || 'No email'}`);
      console.log(`     UID: ${user.uid}`);
      console.log(`     Display Name: ${user.displayName || 'N/A'}`);
      console.log(`     Created: ${user.metadata.creationTime}`);
      console.log(`     Last Sign In: ${user.metadata.lastSignInTime}`);
      console.log(`     Email Verified: ${user.emailVerified}`);
      console.log('');
    });

    console.log('\n--- All Auth Users Summary ---');
    console.log(`Total Auth users: ${users.length}`);

    // Check for users without Firestore profiles
    const db = admin.firestore();
    let missingProfiles = 0;
    let pendingProfiles = 0;

    console.log('\n--- Checking Firestore profiles for Auth users ---');
    for (const user of users) {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        console.log(`  ❌ MISSING FIRESTORE: ${user.email} (UID: ${user.uid})`);
        missingProfiles++;
      } else {
        const data = userDoc.data();
        if (data.status === 'pending') {
          console.log(`  ⏳ PENDING: ${user.email} (UID: ${user.uid})`);
          pendingProfiles++;
        }
      }
    }

    console.log(`\nMissing Firestore profiles: ${missingProfiles}`);
    console.log(`Pending profiles: ${pendingProfiles}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  process.exit(0);
}

listAuthUsers();
