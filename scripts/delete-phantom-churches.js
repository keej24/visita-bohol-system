/**
 * Cleanup Script: Delete phantom church documents and their subcollections
 *
 * Deletes the specified church documents (if they exist) along with all
 * their subcollections (status_audit, import_sessions, etc.).
 *
 * Firestore does not automatically delete subcollections when a parent
 * document is deleted, so this script handles recursive deletion.
 *
 * Usage:
 *   node scripts/delete-phantom-churches.js --dry-run
 *   node scripts/delete-phantom-churches.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const isDryRun = process.argv.includes('--dry-run');

const CHURCHES_TO_DELETE = [
  'tagbilaran_dauis_our_lady_of_the_assumption',
  'tagbilaran_dauis_testdauis',
  'tagbilaran_dimiao_testchurch',
  'tagbilaran_sagbayan_test2',
  'tagbilaran_valencia_testchurch',
  'talibon_jagna_michael_the_archangel_parish',
];

// Known subcollections under church documents
const SUBCOLLECTIONS = ['status_audit', 'import_sessions'];

async function deletePhantomChurches() {
  console.log('🚀 Deleting phantom church documents and subcollections...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE — no changes will be written.\n');
  }
  console.log('='.repeat(70));

  let totalDeleted = 0;
  let totalErrors = 0;

  for (const churchId of CHURCHES_TO_DELETE) {
    console.log(`\n📄 ${churchId}`);
    const churchRef = db.collection('churches').doc(churchId);
    const churchSnap = await churchRef.get();

    // Delete subcollection documents
    for (const sub of SUBCOLLECTIONS) {
      const subSnap = await churchRef.collection(sub).get();
      if (subSnap.size > 0) {
        console.log(`   🗑️  ${sub}: ${subSnap.size} doc(s)`);
        for (const doc of subSnap.docs) {
          try {
            if (!isDryRun) {
              await doc.ref.delete();
            }
            totalDeleted++;
          } catch (err) {
            console.error(`   ❌ Failed to delete ${sub}/${doc.id}: ${err.message}`);
            totalErrors++;
          }
        }
      }
    }

    // Delete the church document itself (if it exists as a real document)
    if (churchSnap.exists) {
      console.log(`   🗑️  Church document (real)`);
      if (!isDryRun) {
        await churchRef.delete();
      }
      totalDeleted++;
    } else {
      console.log(`   ℹ️  Church document is phantom (no doc to delete)`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 Summary:');
  console.log(`   Deleted: ${totalDeleted}`);
  console.log(`   Errors:  ${totalErrors}`);

  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Cleanup complete!');
  }

  process.exit(0);
}

deletePhantomChurches();
