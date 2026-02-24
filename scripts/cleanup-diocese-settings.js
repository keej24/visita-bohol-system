#!/usr/bin/env node

/**
 * One-time cleanup script: Delete diocese_settings Firestore documents.
 * 
 * Diocese logos are now resolved directly from Firebase Storage paths
 * (logos/diocese/{dioceseId}/), so the diocese_settings collection is 
 * no longer needed. This script removes the orphaned documents.
 * 
 * Usage:
 *   node scripts/cleanup-diocese-settings.js
 * 
 * Prerequisites:
 *   - Firebase service account JSON at admin-dashboard/firebase-service-account.json
 *     OR set FIREBASE_SERVICE_ACCOUNT_PATH env variable
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const DIOCESES = ['tagbilaran', 'talibon'];

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

  // Check and delete diocese_settings documents
  let deletedCount = 0;

  for (const dioceseId of DIOCESES) {
    const docRef = db.collection('diocese_settings').doc(dioceseId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      console.log(`📄 Found diocese_settings/${dioceseId}:`);
      console.log(`   logoUrl: ${data?.logoUrl || '(none)'}`);
      console.log(`   updatedAt: ${data?.updatedAt?.toDate?.() || data?.updatedAt || '(none)'}`);
      console.log(`   updatedBy: ${data?.updatedBy || '(none)'}`);

      await docRef.delete();
      console.log(`   ✅ Deleted.\n`);
      deletedCount++;
    } else {
      console.log(`⏭️  diocese_settings/${dioceseId} does not exist, skipping.\n`);
    }
  }

  // Check if there are any other documents in the collection
  const remaining = await db.collection('diocese_settings').limit(5).get();
  if (!remaining.empty) {
    console.log(`⚠️ Found ${remaining.size} additional document(s) in diocese_settings:`);
    remaining.forEach(doc => console.log(`   - ${doc.id}`));
    console.log('   These were NOT deleted. Review manually if needed.\n');
  }

  console.log(`\n🏁 Cleanup complete. Deleted ${deletedCount} document(s).`);
  console.log('   Diocese logos are now served directly from Firebase Storage at:');
  console.log('   logos/diocese/{dioceseId}/logo_*.{ext}');

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
