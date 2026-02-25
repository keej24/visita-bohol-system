#!/usr/bin/env node

/**
 * One-time migration script: Move church_imports documents to
 * churches/{churchId}/import_sessions/{id} subcollection.
 *
 * Import sessions are now stored as a subcollection under their
 * parent church document instead of a top-level collection.
 *
 * Usage:
 *   node scripts/migrate-church-imports.js
 *
 * What it does:
 *   1. Reads all documents from top-level `church_imports` collection
 *   2. For each doc with a valid churchId → copies to churches/{churchId}/import_sessions/{originalId}
 *   3. Deletes the original document from `church_imports`
 *   4. Logs orphaned docs (no churchId) for manual review
 *
 * Prerequisites:
 *   - Firebase service account JSON at admin-dashboard/firebase-service-account.json
 *     OR set FIREBASE_SERVICE_ACCOUNT_PATH env variable
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function main() {
  // Initialize Firebase Admin SDK
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '../admin-dashboard/firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    console.log('⚠️ Firebase service account not found. Using default credentials.');
    admin.initializeApp();
  }

  const db = admin.firestore();
  console.log('✅ Firebase Admin SDK initialized\n');

  // Read all church_imports documents
  const snapshot = await db.collection('church_imports').get();

  if (snapshot.empty) {
    console.log('ℹ️  No documents found in church_imports collection. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`📋 Found ${snapshot.size} document(s) in church_imports\n`);

  let migratedCount = 0;
  let orphanedCount = 0;
  let errorCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const importId = docSnap.id;
    const churchId = data.churchId;

    if (!churchId) {
      console.log(`⚠️  Orphaned: church_imports/${importId} (no churchId)`);
      console.log(`   createdBy: ${data.createdBy || '(none)'}`);
      console.log(`   status: ${data.status || '(none)'}`);
      console.log(`   fileName: ${data.sourceFile?.name || '(none)'}`);
      console.log('   → Skipped (no church to migrate to)\n');
      orphanedCount++;
      continue;
    }

    try {
      // Verify the target church exists
      const churchDoc = await db.collection('churches').doc(churchId).get();
      if (!churchDoc.exists) {
        console.log(`⚠️  church_imports/${importId} → church ${churchId} does not exist`);
        console.log('   → Skipped (target church missing)\n');
        orphanedCount++;
        continue;
      }

      // Copy to subcollection
      const targetRef = db
        .collection('churches')
        .doc(churchId)
        .collection('import_sessions')
        .doc(importId);

      await targetRef.set(data);

      // Delete original
      await docSnap.ref.delete();

      console.log(`✅ Migrated: church_imports/${importId} → churches/${churchId}/import_sessions/${importId}`);
      console.log(`   status: ${data.status}, file: ${data.sourceFile?.name || '(none)'}`);
      migratedCount++;
    } catch (error) {
      console.error(`❌ Error migrating church_imports/${importId}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Migration Complete');
  console.log(`   Migrated: ${migratedCount}`);
  console.log(`   Orphaned/Skipped: ${orphanedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('='.repeat(60));

  if (orphanedCount > 0) {
    console.log('\n⚠️  Orphaned documents were left in church_imports.');
    console.log('   Review them manually in the Firestore console and delete if not needed.');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
