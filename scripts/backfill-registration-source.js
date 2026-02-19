/**
 * Backfill Migration Script: registrationSource field
 * ====================================================
 *
 * This script adds the `registrationSource` field to existing parish user
 * documents that don't already have it.
 *
 * Logic:
 * - If `createdBy` field exists → registrationSource = 'chancery'
 *   (account was created by a Chancery Office user)
 * - If `createdBy` is absent → registrationSource = 'self'
 *   (account was self-registered via parish staff registration form)
 *
 * Usage:
 *   node scripts/backfill-registration-source.js [--dry-run]
 *
 * Options:
 *   --dry-run   Preview changes without writing to Firestore
 *
 * Prerequisites:
 *   - Firebase Admin SDK service account at admin-dashboard/firebase-service-account.json
 *   - Node.js 18+
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'admin-dashboard', 'firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error('❌ Failed to load service account from:', serviceAccountPath);
  console.error('   Make sure firebase-service-account.json exists in admin-dashboard/');
  process.exit(1);
}

const db = admin.firestore();
const isDryRun = process.argv.includes('--dry-run');

async function backfillRegistrationSource() {
  console.log('🚀 Backfill registrationSource for parish user documents');
  console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN (no writes)' : '✍️  LIVE (will write to Firestore)'}`);
  console.log('');

  // Query all parish-role users
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('role', '==', 'parish').get();

  console.log(`📋 Found ${snapshot.size} parish user documents`);
  console.log('');

  let updatedCount = 0;
  let skippedCount = 0;
  let chanceryCount = 0;
  let selfCount = 0;

  const batch = db.batch();
  const BATCH_LIMIT = 500;
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if already has registrationSource
    if (data.registrationSource) {
      skippedCount++;
      console.log(`  ⏭️  ${data.email || doc.id} — already has registrationSource: '${data.registrationSource}'`);
      continue;
    }

    // Determine source based on createdBy presence
    const hasCreatedBy = !!data.createdBy;
    const source = hasCreatedBy ? 'chancery' : 'self';

    if (source === 'chancery') {
      chanceryCount++;
    } else {
      selfCount++;
    }

    console.log(`  ${source === 'chancery' ? '🏛️' : '📝'}  ${data.email || doc.id} → registrationSource: '${source}'`
      + (hasCreatedBy ? ` (createdBy: ${typeof data.createdBy === 'object' ? data.createdBy.email : data.createdBy})` : ' (no createdBy field)'));

    if (!isDryRun) {
      batch.update(doc.ref, { registrationSource: source });
      batchCount++;

      // Firestore batch limit is 500 operations
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        console.log(`  💾 Committed batch of ${batchCount} updates`);
        batchCount = 0;
      }
    }

    updatedCount++;
  }

  // Commit remaining batch
  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`  💾 Committed final batch of ${batchCount} updates`);
  }

  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total parish documents: ${snapshot.size}`);
  console.log(`   Already had registrationSource: ${skippedCount}`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`     → chancery: ${chanceryCount}`);
  console.log(`     → self: ${selfCount}`);
  console.log('');

  if (isDryRun) {
    console.log('ℹ️  This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('✅ Backfill complete!');
  }
}

backfillRegistrationSource()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  });
