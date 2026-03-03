/**
 * Diagnostic Script: Find phantom church documents
 *
 * Lists all church IDs in the churches collection that appear as
 * subcollection parents (status_audit, import_sessions) but don't
 * have an actual church document.
 *
 * Usage:
 *   node scripts/find-phantom-churches.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findPhantoms() {
  console.log('🔍 Scanning for phantom church documents...\n');

  // Get all real church documents
  const realSnap = await db.collection('churches').get();
  const realIds = new Set();
  realSnap.forEach(d => realIds.add(d.id));
  console.log(`📊 Real church documents: ${realIds.size}\n`);

  // Find all subcollection parents
  const parentIds = new Set();

  const auditSnap = await db.collectionGroup('status_audit').get();
  auditSnap.forEach(d => {
    if (d.ref.parent.parent) parentIds.add(d.ref.parent.parent.id);
  });

  const importSnap = await db.collectionGroup('import_sessions').get();
  importSnap.forEach(d => {
    if (d.ref.parent.parent) parentIds.add(d.ref.parent.parent.id);
  });

  console.log(`📊 Church IDs referenced by subcollections: ${parentIds.size}\n`);
  console.log('='.repeat(70));

  let phantomCount = 0;
  for (const id of parentIds) {
    if (!realIds.has(id)) {
      const auditCount = (await db.collection('churches').doc(id).collection('status_audit').get()).size;
      const importCount = (await db.collection('churches').doc(id).collection('import_sessions').get()).size;
      console.log(`⚠️  PHANTOM: "${id}"`);
      console.log(`   status_audit docs: ${auditCount}`);
      console.log(`   import_sessions docs: ${importCount}`);
      console.log('');
      phantomCount++;
    }
  }

  console.log('='.repeat(70));
  if (phantomCount === 0) {
    console.log('✅ No phantom documents found. All subcollection parents are real documents.');
  } else {
    console.log(`⚠️  Total phantoms: ${phantomCount}`);
  }

  process.exit(0);
}

findPhantoms();
