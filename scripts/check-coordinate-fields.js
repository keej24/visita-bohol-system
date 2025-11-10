/**
 * Check what coordinate fields actually exist in Firestore
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCoordinateFields() {
  console.log('🔍 Checking coordinate field structure in Firestore...\n');

  try {
    const churchesSnapshot = await db.collection('churches').get();

    churchesSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n📍 Church: ${data.name || 'Unknown'}`);
      console.log(`   ID: ${doc.id}`);
      console.log('\n   Raw data fields:');

      // Check for different possible coordinate field names
      console.log(`   - latitude: ${data.latitude}`);
      console.log(`   - longitude: ${data.longitude}`);
      console.log(`   - coordinates: ${JSON.stringify(data.coordinates)}`);
      console.log(`   - coordinates.lat: ${data.coordinates?.lat}`);
      console.log(`   - coordinates.lng: ${data.coordinates?.lng}`);
      console.log(`   - coordinates.latitude: ${data.coordinates?.latitude}`);
      console.log(`   - coordinates.longitude: ${data.coordinates?.longitude}`);

      console.log('\n   All fields in document:');
      console.log('   ' + Object.keys(data).join(', '));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await admin.app().delete();
  }
}

checkCoordinateFields();
