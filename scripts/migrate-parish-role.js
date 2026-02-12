/**
 * Migration Script: Update parish_secretary role to parish
 * 
 * This script updates all existing user documents in Firestore
 * from role: 'parish_secretary' to role: 'parish'
 * 
 * Usage:
 *   cd scripts
 *   node migrate-parish-role.js
 * 
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --apply      Actually apply the migration
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../admin-dashboard/firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Failed to load service account:', error.message);
  console.log('\nMake sure firebase-service-account.json exists in admin-dashboard/');
  process.exit(1);
}

const db = admin.firestore();

async function migrateParishRole(dryRun = true) {
  console.log('='.repeat(60));
  console.log('Parish Role Migration: parish_secretary → parish');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (preview only)' : '⚡ APPLYING CHANGES'}`);
  console.log('');

  try {
    // Query all users with role: 'parish_secretary'
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', 'parish_secretary').get();

    if (snapshot.empty) {
      console.log('✅ No users found with role "parish_secretary". Migration not needed.');
      return { migrated: 0, errors: 0 };
    }

    console.log(`📋 Found ${snapshot.size} user(s) with role "parish_secretary"\n`);

    let migrated = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const displayName = userData.name || userData.email || doc.id;
      const position = userData.position || 'parish_secretary';
      
      console.log(`  ${migrated + errors + 1}. ${displayName}`);
      console.log(`     Email: ${userData.email}`);
      console.log(`     Position: ${position}`);
      console.log(`     Parish: ${userData.parishInfo?.name || userData.parish || 'N/A'}`);
      console.log(`     Status: ${userData.status}`);

      if (dryRun) {
        console.log(`     → Would update role: "parish_secretary" → "parish"`);
        migrated++;
      } else {
        try {
          await doc.ref.update({
            role: 'parish',
            _migrated: {
              from: 'parish_secretary',
              to: 'parish',
              migratedAt: admin.firestore.FieldValue.serverTimestamp(),
              script: 'migrate-parish-role.js'
            }
          });
          console.log(`     ✅ Updated successfully`);
          migrated++;
        } catch (updateError) {
          console.log(`     ❌ Error: ${updateError.message}`);
          errors++;
        }
      }
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('Migration Summary:');
    console.log(`  ${dryRun ? 'Would migrate' : 'Migrated'}: ${migrated} user(s)`);
    if (errors > 0) {
      console.log(`  Errors: ${errors}`);
    }
    console.log('='.repeat(60));

    if (dryRun && migrated > 0) {
      console.log('\n💡 To apply migration, run:');
      console.log('   node migrate-parish-role.js --apply\n');
    }

    return { migrated, errors };

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Also check for any notifications that reference parish_secretary
async function migrateNotifications(dryRun = true) {
  console.log('\n' + '='.repeat(60));
  console.log('Checking Notifications Collection...');
  console.log('='.repeat(60));

  try {
    const notificationsRef = db.collection('notifications');
    
    // Get all notifications (we'll filter client-side since Firestore doesn't support
    // querying array elements directly)
    const snapshot = await notificationsRef.get();
    
    let toUpdate = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const roles = data.recipients?.roles || [];
      
      if (roles.includes('parish_secretary')) {
        toUpdate.push({
          doc,
          data,
          newRoles: roles.map(r => r === 'parish_secretary' ? 'parish' : r)
        });
      }
    }

    if (toUpdate.length === 0) {
      console.log('✅ No notifications need role updates.');
      return { migrated: 0, errors: 0 };
    }

    console.log(`📋 Found ${toUpdate.length} notification(s) with "parish_secretary" role\n`);

    let migrated = 0;
    let errors = 0;

    for (const item of toUpdate) {
      const { doc, data, newRoles } = item;
      console.log(`  - ${data.title || doc.id}`);
      console.log(`    Type: ${data.type}`);
      console.log(`    Old roles: [${data.recipients.roles.join(', ')}]`);
      console.log(`    New roles: [${newRoles.join(', ')}]`);

      if (dryRun) {
        console.log(`    → Would update`);
        migrated++;
      } else {
        try {
          await doc.ref.update({
            'recipients.roles': newRoles
          });
          console.log(`    ✅ Updated`);
          migrated++;
        } catch (updateError) {
          console.log(`    ❌ Error: ${updateError.message}`);
          errors++;
        }
      }
      console.log('');
    }

    console.log(`Notifications ${dryRun ? 'to migrate' : 'migrated'}: ${migrated}`);
    if (errors > 0) {
      console.log(`Errors: ${errors}`);
    }

    return { migrated, errors };

  } catch (error) {
    console.error('❌ Notification migration failed:', error.message);
    return { migrated: 0, errors: 1 };
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node migrate-parish-role.js [options]

Options:
  --dry-run    Preview changes without applying them (default)
  --apply      Actually apply the migration
  --help, -h   Show this help message
`);
    process.exit(0);
  }

  try {
    // Migrate users
    const userResult = await migrateParishRole(dryRun);
    
    // Migrate notifications
    const notifResult = await migrateNotifications(dryRun);

    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Users ${dryRun ? 'to migrate' : 'migrated'}: ${userResult.migrated}`);
    console.log(`Notifications ${dryRun ? 'to migrate' : 'migrated'}: ${notifResult.migrated}`);
    console.log(`Total errors: ${userResult.errors + notifResult.errors}`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
