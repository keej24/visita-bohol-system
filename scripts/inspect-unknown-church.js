/**
 * Inspect the "Unknown" church to see what it is
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectUnknownChurch() {
  console.log('🔍 Inspecting the "Unknown" church...\n');

  try {
    const doc = await db.collection('churches').doc('c3dspsI195jcSyyTKddC').get();

    if (!doc.exists) {
      console.log('❌ Document not found!');
      return;
    }

    const data = doc.data();
    console.log('📄 Full Document Data:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));

    console.log('\n📊 Summary:');
    console.log(`Document ID: ${doc.id}`);
    console.log(`Name: ${data.name || 'Not set'}`);
    console.log(`Diocese: ${data.diocese || 'Not set'}`);
    console.log(`Parish ID: ${data.parishId || 'Not set'}`);
    console.log(`Address: ${data.address || 'Not set'}`);
    console.log(`GPS: ${JSON.stringify(data.gps) || 'Not set'}`);
    console.log(`Founded: ${data.founded || 'Not set'}`);
    console.log(`Style: ${data.style || 'Not set'}`);
    console.log(`Classification: ${data.classification || 'Not set'}`);
    console.log(`Status: ${data.status || 'Not set'}`);
    console.log(`Created By: ${data.createdBy || 'Not set'}`);
    console.log(`Media: ${JSON.stringify(data.media) || 'Not set'}`);

    console.log('\n🔑 All Fields:');
    console.log(Object.keys(data).join(', '));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await admin.app().delete();
  }
}

inspectUnknownChurch();
