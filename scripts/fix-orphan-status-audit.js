/**
 * Cleanup Script: Fix orphaned status_audit subcollections
 *
 * The status_audit migration created subcollections under phantom church
 * documents that used display names as IDs. This script moves those
 * audit docs to the correct parent church documents and deletes the orphans.
 *
 * Mapping:
 *   "Birhen sa Barangay Shrine Parish"  → tagbilaran_tagbilaran_city_birhen_sa_barangay_shrine_parish
 *   "Our Lady of Guadalupe"             → tagbilaran_tagbilaran_city_our_lady_of_guadalupe
 *   "St. Joseph the Worker Parish"      → tagbilaran_tagbilaran_city_saint_joseph_the_worker_cathedral_shrine
 *
 * Usage:
 *   node scripts/fix-orphan-status-audit.js --dry-run
 *   node scripts/fix-orphan-status-audit.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const isDryRun = process.argv.includes('--dry-run');

const MAPPING = {
  'Birhen sa Barangay Shrine Parish': 'tagbilaran_tagbilaran_city_birhen_sa_barangay_shrine_parish',
  'Our Lady of Guadalupe': 'tagbilaran_tagbilaran_city_our_lady_of_guadalupe',
  'St. Joseph the Worker Parish': 'tagbilaran_tagbilaran_city_saint_joseph_the_worker_cathedral_shrine',
};

async function fixOrphanAudit() {
  console.log('🚀 Fixing orphaned status_audit subcollections...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE — no changes will be written.\n');
  }
  console.log('='.repeat(70));

  let moved = 0;
  let errors = 0;

  for (const [phantomId, realId] of Object.entries(MAPPING)) {
    console.log(`\n📄 "${phantomId}" → ${realId}`);

    // Verify real document exists
    const realSnap = await db.collection('churches').doc(realId).get();
    if (!realSnap.exists) {
      console.log(`  ❌ Real document ${realId} does not exist! Skipping.`);
      errors++;
      continue;
    }

    // Get orphaned audit docs
    const auditSnap = await db.collection('churches').doc(phantomId).collection('status_audit').get();
    console.log(`  Found ${auditSnap.size} audit doc(s) to relocate`);

    for (const doc of auditSnap.docs) {
      const data = doc.data();

      try {
        if (!isDryRun) {
          // Update churchId field to the correct ID
          const fixedData = { ...data, churchId: realId };

          // Write to correct location
          await db
            .collection('churches')
            .doc(realId)
            .collection('status_audit')
            .doc(doc.id)
            .set(fixedData);

          // Delete from orphaned location
          await doc.ref.delete();
        }

        console.log(`  ✅ ${doc.id} → churches/${realId}/status_audit/${doc.id}`);
        moved++;
      } catch (err) {
        console.error(`  ❌ ${doc.id} — error: ${err.message}`);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 Summary:');
  console.log(`   Moved:  ${moved}`);
  console.log(`   Errors: ${errors}`);

  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Cleanup complete! Phantom parents will disappear from Firestore console.');
  }

  process.exit(0);
}

fixOrphanAudit();
