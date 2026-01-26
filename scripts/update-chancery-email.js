#!/usr/bin/env node

/**
 * Script to update the Tagbilaran Chancery email in Firebase
 * Updates both Firebase Auth and Firestore user document
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../admin-dashboard/firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('Make sure you have the firebase-service-account.json file in the admin-dashboard directory');
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

async function updateChanceryEmail() {
  const oldEmail = 'dioceseoftagbilaran@gmail.com'; // Previous email
  const newEmail = 'dioceseoftagbilaran1941@gmail.com'; // Official institutional email
  const customUID = 'chancery_tagbilaran_001'; // Custom UID for consistency

  try {
    console.log('🔄 Starting email update process...');
    
    // Step 1: Get current user data from Firestore
    console.log('1. Getting current user data from Firestore...');
    const userRef = db.collection('users').doc(customUID);
    const userDoc = await userRef.get();
    let userData = null;
    
    if (userDoc.exists) {
      userData = userDoc.data();
      console.log('✅ Found existing Firestore document');
    } else {
      // If no document with custom UID, try to find by email in other docs
      console.log('⚠️  No document with custom UID, will create new profile');
      userData = {
        role: 'chancery_office',
        name: 'Tagbilaran Chancery Office',
        diocese: 'tagbilaran',
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        permissions: ['manage_users', 'approve_churches', 'generate_reports', 'moderate_feedback']
      };
    }

    // Step 2: Try to delete old user from Firebase Auth
    console.log('2. Removing old user from Firebase Auth...');
    try {
      const oldUserRecord = await auth.getUserByEmail(oldEmail);
      await auth.deleteUser(oldUserRecord.uid);
      console.log('✅ Old user deleted from Firebase Auth');
    } catch (deleteError) {
      console.log('⚠️  Old user not found in Firebase Auth (may already be deleted)');
    }

    // Step 3: Create new user with custom UID
    console.log('3. Creating new user with correct email...');
    try {
      const newUserRecord = await auth.createUser({
        uid: customUID,
        email: newEmail,
        emailVerified: true,
        password: 'ChanceryTagbilaran2025!', // Temporary password
      });
      console.log('✅ New user created in Firebase Auth');
      console.log(`   UID: ${newUserRecord.uid}`);
      console.log(`   Email: ${newUserRecord.email}`);
    } catch (createError) {
      if (createError.code === 'auth/uid-already-exists') {
        console.log('⚠️  User with this UID already exists, updating instead...');
        await auth.updateUser(customUID, {
          email: newEmail
        });
        console.log('✅ Existing user updated in Firebase Auth');
      } else {
        throw createError;
      }
    }

    // Step 4: Update Firestore document
    console.log('4. Updating Firestore user document...');
    await userRef.set({
      ...userData,
      email: newEmail,
      lastModified: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Firestore user document updated successfully');

    // Step 5: Verify the update
    console.log('5. Verifying updates...');
    const updatedDoc = await userRef.get();
    const finalUserData = updatedDoc.data();
    
    console.log('📋 Final user data:');
    console.log(`   Email: ${finalUserData.email}`);
    console.log(`   Name: ${finalUserData.name}`);
    console.log(`   Role: ${finalUserData.role}`);
    console.log(`   Diocese: ${finalUserData.diocese}`);
    console.log(`   UID: ${customUID}`);
    
    console.log('');
    console.log('🎉 Email update completed successfully!');
    console.log(`   Old email: ${oldEmail}`);
    console.log(`   New email: ${newEmail}`);
    console.log('');
    console.log('🔐 You can now login with:');
    console.log(`   Email: ${newEmail}`);
    console.log(`   Password: ChanceryTagbilaran2025!`);
    
  } catch (error) {
    console.error('❌ Error during update process:', error);
  }
}

// Run the update
updateChanceryEmail()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });