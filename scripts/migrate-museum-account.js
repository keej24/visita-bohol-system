/**
 * Museum Researcher Account Migration Script
 * 
 * This script migrates the museum researcher account from the old email
 * to the new email (bohol@nationalmuseum.gov.ph).
 * 
 * Prerequisites:
 * 1. Firebase Admin SDK service account key file
 * 2. Node.js installed
 * 
 * Usage:
 * 1. Place your Firebase service account key in admin-dashboard/firebase-service-account.json
 * 2. Run: node scripts/migrate-museum-account.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Configuration
const OLD_EMAIL = 'researcher.heritage@museum.ph';
const NEW_EMAIL = 'bohol@nationalmuseum.gov.ph';
const TEMP_PASSWORD = 'Museum@Bohol2024!'; // Change this after first login!

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../admin-dashboard/firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin');
  console.error('   Make sure firebase-service-account.json exists in admin-dashboard/');
  console.error('   Error:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function migrateMuseumAccount() {
  console.log('\n🔄 Starting Museum Researcher Account Migration...\n');

  try {
    // Step 1: Find the old Firestore document
    console.log('📋 Step 1: Finding existing Firestore document...');
    const usersRef = db.collection('users');
    const oldSnapshot = await usersRef.where('email', '==', NEW_EMAIL).get();
    
    let oldDocData = null;
    let oldDocId = null;
    
    if (!oldSnapshot.empty) {
      oldDocId = oldSnapshot.docs[0].id;
      oldDocData = oldSnapshot.docs[0].data();
      console.log(`   Found document: ${oldDocId}`);
      console.log(`   Current email: ${oldDocData.email}`);
    } else {
      // Try finding by old email
      const legacySnapshot = await usersRef.where('email', '==', OLD_EMAIL).get();
      if (!legacySnapshot.empty) {
        oldDocId = legacySnapshot.docs[0].id;
        oldDocData = legacySnapshot.docs[0].data();
        console.log(`   Found legacy document: ${oldDocId}`);
      } else {
        console.log('   ⚠️ No existing document found. Will create new one.');
      }
    }

    // Step 2: Check if old Auth account exists and delete it
    console.log('\n📋 Step 2: Checking Firebase Authentication...');
    try {
      const oldAuthUser = await auth.getUserByEmail(OLD_EMAIL);
      console.log(`   Found old auth account: ${oldAuthUser.uid}`);
      await auth.deleteUser(oldAuthUser.uid);
      console.log('   ✅ Deleted old auth account');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('   Old auth account not found (already deleted or never existed)');
      } else {
        throw error;
      }
    }

    // Step 3: Check if new email already exists in Auth
    console.log('\n📋 Step 3: Checking if new email exists in Auth...');
    let newAuthUser = null;
    try {
      newAuthUser = await auth.getUserByEmail(NEW_EMAIL);
      console.log(`   New email already exists with UID: ${newAuthUser.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('   New email not found in Auth. Will create new account.');
      } else {
        throw error;
      }
    }

    // Step 4: Create new Auth account if needed
    if (!newAuthUser) {
      console.log('\n📋 Step 4: Creating new Firebase Auth account...');
      newAuthUser = await auth.createUser({
        email: NEW_EMAIL,
        password: TEMP_PASSWORD,
        displayName: 'National Museum of the Philippines - Bohol',
        emailVerified: true
      });
      console.log(`   ✅ Created new auth account: ${newAuthUser.uid}`);
      console.log(`   📧 Email: ${NEW_EMAIL}`);
      console.log(`   🔑 Temporary Password: ${TEMP_PASSWORD}`);
    } else {
      console.log('\n📋 Step 4: Auth account already exists, skipping creation.');
    }

    // Step 5: Set custom claims for the new user
    console.log('\n📋 Step 5: Setting custom claims...');
    await auth.setCustomUserClaims(newAuthUser.uid, {
      role: 'museum_researcher',
      diocese: 'tagbilaran'
    });
    console.log('   ✅ Custom claims set');

    // Step 6: Create/Update Firestore document with new UID
    console.log('\n📋 Step 6: Updating Firestore document...');
    
    const newUserData = {
      email: NEW_EMAIL,
      name: oldDocData?.name || 'National Museum of the Philippines - Bohol',
      institutionName: oldDocData?.institutionName || 'National Museum of the Philippines - Bohol',
      role: 'museum_researcher',
      diocese: 'tagbilaran',
      isPreConfigured: true,
      permissions: oldDocData?.permissions || ['validate_heritage', 'enhance_cultural_content'],
      createdAt: oldDocData?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(oldDocData?.address && { address: oldDocData.address }),
      ...(oldDocData?.department && { department: oldDocData.department }),
      ...(oldDocData?.position && { position: oldDocData.position }),
      ...(oldDocData?.phoneNumber && { phoneNumber: oldDocData.phoneNumber }),
      ...(oldDocData?.profileImageUrl && { profileImageUrl: oldDocData.profileImageUrl })
    };

    // Create document with new UID
    await db.collection('users').doc(newAuthUser.uid).set(newUserData, { merge: true });
    console.log(`   ✅ Created/updated document with UID: ${newAuthUser.uid}`);

    // Step 7: Delete old document if different from new
    if (oldDocId && oldDocId !== newAuthUser.uid) {
      console.log('\n📋 Step 7: Cleaning up old document...');
      await db.collection('users').doc(oldDocId).delete();
      console.log(`   ✅ Deleted old document: ${oldDocId}`);
    } else {
      console.log('\n📋 Step 7: No cleanup needed.');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📧 New Email:', NEW_EMAIL);
    console.log('🔑 Temporary Password:', TEMP_PASSWORD);
    console.log('🆔 New UID:', newAuthUser.uid);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateMuseumAccount().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});
