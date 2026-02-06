/**
 * Script to fix orphaned Firebase Auth users by creating their Firestore profiles
 * Run with: node fix-orphaned-users.js
 * 
 * This handles users who have Firebase Auth accounts but no Firestore profile
 * (usually due to failed registration flow)
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

const db = admin.firestore();
const auth = admin.auth();

// Check for command line argument
const action = process.argv[2]; // 'create', 'delete', or undefined (interactive)

async function fixOrphanedUsers() {
  console.log('🔍 Finding orphaned Firebase Auth users (no Firestore profile)...\n');

  try {
    // List all Auth users
    const listUsersResult = await auth.listUsers(1000);
    const orphanedUsers = [];

    for (const user of listUsersResult.users) {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) {
        orphanedUsers.push(user);
      }
    }

    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned users found! All Auth users have Firestore profiles.');
      process.exit(0);
    }

    console.log(`Found ${orphanedUsers.length} orphaned users:\n`);
    orphanedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Created: ${user.metadata.creationTime}`);
      console.log('');
    });

    const answer = action || 'c'; // Default to create if no argument provided

    if (answer === 'c' || answer === 'create') {
      console.log('\n📝 Creating Firestore profiles...\n');
      
      for (const user of orphanedUsers) {
        // Determine role from email domain/pattern
        let role = 'parish_secretary'; // Default
        let diocese = 'tagbilaran'; // Default
        
        if (user.email.includes('chancery') || user.email.includes('diocese')) {
          role = 'chancery_office';
          if (user.email.includes('talibon')) {
            diocese = 'talibon';
          }
        } else if (user.email.includes('museum') || user.email.includes('researcher')) {
          role = 'museum_researcher';
        } else if (user.email.includes('shrine') || user.email.includes('parish')) {
          role = 'parish_secretary';
        }

        const profileData = {
          uid: user.uid,
          email: user.email.toLowerCase(),
          name: user.displayName || user.email.split('@')[0],
          role: role,
          status: 'pending',
          accountType: 'admin',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          requirePasswordChange: false,
        };

        // Add diocese for roles that need it
        if (role === 'chancery_office' || role === 'parish_secretary') {
          profileData.diocese = diocese;
        }

        try {
          await db.collection('users').doc(user.uid).set(profileData);
          console.log(`✅ Created profile for: ${user.email} (${role})`);
        } catch (err) {
          console.error(`❌ Failed to create profile for ${user.email}:`, err.message);
        }
      }

      console.log('\n✅ Done! Pending profiles created. They can now be approved by admins.');

    } else if (answer === 'd' || answer === 'delete') {
      console.log('\n🗑️ Deleting orphaned Auth accounts...\n');
      
      for (const user of orphanedUsers) {
        try {
          await auth.deleteUser(user.uid);
          console.log(`✅ Deleted: ${user.email}`);
        } catch (err) {
          console.error(`❌ Failed to delete ${user.email}:`, err.message);
        }
      }

      console.log('\n✅ Done! Orphaned accounts deleted. Users can re-register.');

    } else {
      console.log('\n⏭️ Skipped. No changes made.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  process.exit(0);
}

fixOrphanedUsers();
