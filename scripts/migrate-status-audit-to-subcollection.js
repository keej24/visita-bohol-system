/**
 * Migration Script: Move church_status_audit → churches/{churchId}/status_audit
 *
 * This script moves all documents from the top-level `church_status_audit`
 * collection into subcollections under their respective church documents.
 *
 * BEFORE (top-level collection):
 *   church_status_audit/{auditId} → { churchId: "abc", fromStatus: "pending", ... }
 *
 * AFTER (subcollection):
 *   churches/abc/status_audit/{auditId} → { churchId: "abc", fromStatus: "pending", ... }
 *   church_status_audit/{auditId} → DELETED
 *
 * Usage:
 *   node scripts/migrate-status-audit-to-subcollection.js
 *   node scripts/migrate-status-audit-to-subcollection.js --dry-run
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const isDryRun = process.argv.includes('--dry-run');

async function migrateStatusAudit() {
  console.log('🚀 Starting church_status_audit → churches/{churchId}/status_audit migration...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE — no changes will be written.\n');
  }
  console.log('='.repeat(70));

  try {
    const auditSnapshot = await db.collection('church_status_audit').get();

    if (auditSnapshot.empty) {
      console.log('✅ No documents found in church_status_audit — nothing to migrate.');
      process.exit(0);
    }

    console.log(`📊 Found ${auditSnapshot.size} audit log(s) to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of auditSnapshot.docs) {
      const data = doc.data();
      const churchId = data.churchId;

      if (!churchId) {
        console.log(`  ⚠️  ${doc.id} — missing churchId field, skipping`);
        skipped++;
        continue;
      }

      try {
        if (!isDryRun) {
          // Write to new subcollection location
          await db
            .collection('churches')
            .doc(churchId)
            .collection('status_audit')
            .doc(doc.id)
            .set(data);

          // Delete from old top-level collection
          await doc.ref.delete();
        }

        console.log(`  ✅ ${doc.id} → churches/${churchId}/status_audit/${doc.id}`);
        migrated++;
      } catch (err) {
        console.error(`  ❌ ${doc.id} — error: ${err.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 Migration Summary:');
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped:  ${skipped}`);
    console.log(`   Errors:   ${errors}`);
    console.log(`   Total:    ${auditSnapshot.size}`);

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

migrateStatusAudit();
