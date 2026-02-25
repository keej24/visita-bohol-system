/**
 * Migration Script: Rename priestHistory → priest_assignment
 *
 * This script renames the `priestHistory` field to `priest_assignment`
 * on all church documents in Firestore to match the updated data model.
 *
 * BEFORE:
 * {
 *   priestHistory: [{ name: "Rev. Fr. Juan", startDate: "2020-01-01", isCurrent: true }]
 * }
 *
 * AFTER:
 * {
 *   priest_assignment: [{ name: "Rev. Fr. Juan", startDate: "2020-01-01", isCurrent: true }],
 *   priestHistory: FieldValue.delete()
 * }
 *
 * Usage:
 *   node scripts/migrate-priest-history-field.js
 *   node scripts/migrate-priest-history-field.js --dry-run
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const isDryRun = process.argv.includes('--dry-run');

async function migratePriestHistoryField() {
  console.log('🚀 Starting priestHistory → priest_assignment migration...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE — no changes will be written.\n');
  }
  console.log('='.repeat(70));

  try {
    const churchesSnapshot = await db.collection('churches').get();

    if (churchesSnapshot.empty) {
      console.log('❌ No churches found in the database!');
      return;
    }

    console.log(`📊 Found ${churchesSnapshot.size} churches\n`);

    let migrated = 0;
    let skipped = 0;
    let alreadyMigrated = 0;
    let errors = 0;

    for (const doc of churchesSnapshot.docs) {
      const data = doc.data();
      const churchName = data.name || 'Unknown';

      // Case 1: Already has priest_assignment and no priestHistory — fully migrated
      if (data.priest_assignment && !data.priestHistory) {
        console.log(`  ✅ ${churchName} — already migrated (has priest_assignment)`);
        alreadyMigrated++;
        continue;
      }

      // Case 2: Has priestHistory — needs migration
      if (data.priestHistory) {
        const entries = Array.isArray(data.priestHistory) ? data.priestHistory : [];
        console.log(`  🔄 ${churchName} — migrating ${entries.length} priest assignment(s)`);

        if (!isDryRun) {
          await doc.ref.update({
            priest_assignment: entries,
            priestHistory: admin.firestore.FieldValue.delete(),
          });
        }

        migrated++;
        continue;
      }

      // Case 3: Neither field exists — nothing to do
      console.log(`  ⏭️  ${churchName} — no priestHistory or priest_assignment field`);
      skipped++;
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 Migration Summary:');
    console.log(`   Migrated:         ${migrated}`);
    console.log(`   Already migrated: ${alreadyMigrated}`);
    console.log(`   Skipped (empty):  ${skipped}`);
    console.log(`   Errors:           ${errors}`);
    console.log(`   Total:            ${churchesSnapshot.size}`);

    if (isDryRun) {
      console.log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Migration complete!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migratePriestHistoryField();
