/**
 * Migration Script: Move Coordinates to Root Level
 *
 * This script migrates church coordinates from nested object format
 * to root level fields for mobile app compatibility.
 *
 * BEFORE:
 * {
 *   coordinates: { latitude: 9.6477, longitude: 123.8559 }
 * }
 *
 * AFTER:
 * {
 *   latitude: 9.6477,
 *   longitude: 123.8559
 * }
 */

const admin = require('firebase-admin');
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateCoordinates() {
  console.log('🚀 Starting coordinate migration...\n');

  try {
    const churchesSnapshot = await db.collection('churches').get();

    if (churchesSnapshot.empty) {
      console.log('❌ No churches found in the database!');
      return;
    }

    console.log(`📊 Found ${churchesSnapshot.size} churches\n`);
    console.log('=' .repeat(80));

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of churchesSnapshot.docs) {
      const data = doc.data();
      const churchName = data.name || 'Unknown';

      console.log(`\n📍 Processing: ${churchName} (ID: ${doc.id})`);

      // Check if coordinates need migration
      if (data.coordinates && typeof data.coordinates === 'object') {
        const lat = data.coordinates.latitude;
        const lng = data.coordinates.longitude;

        if (lat != null && lng != null) {
          console.log(`   Current: coordinates.latitude=${lat}, coordinates.longitude=${lng}`);
          console.log(`   Target: latitude=${lat}, longitude=${lng} (root level)`);

          try {
            // Update document with coordinates at root level
            await doc.ref.update({
              latitude: lat,
              longitude: lng
            });

            migrated++;
            console.log(`   ✅ Migrated successfully!`);
          } catch (error) {
            errors++;
            console.log(`   ❌ Error during migration: ${error.message}`);
          }
        } else {
          skipped++;
          console.log(`   ⏭️  Skipped: coordinates object exists but values are null/undefined`);
        }
      } else if (data.latitude != null && data.longitude != null) {
        skipped++;
        console.log(`   ⏭️  Skipped: already has root-level coordinates (lat=${data.latitude}, lng=${data.longitude})`);
      } else {
        skipped++;
        console.log(`   ⏭️  Skipped: no coordinates found`);
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('📈 MIGRATION SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`Total Churches:       ${churchesSnapshot.size}`);
    console.log(`✅ Migrated:          ${migrated}`);
    console.log(`⏭️  Skipped:           ${skipped}`);
    console.log(`❌ Errors:            ${errors}`);
    console.log('=' .repeat(80));

    if (migrated > 0) {
      console.log('\n🎉 Migration completed! Running verification...\n');
      await verifyMigration();
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await admin.app().delete();
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration results...\n');

  const churchesSnapshot = await db.collection('churches').get();

  let withRootCoordinates = 0;
  let withoutCoordinates = 0;

  churchesSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.latitude != null && data.longitude != null) {
      withRootCoordinates++;
      console.log(`✅ ${data.name || 'Unknown'}: lat=${data.latitude}, lng=${data.longitude}`);
    } else {
      withoutCoordinates++;
      console.log(`❌ ${data.name || 'Unknown'}: No root-level coordinates`);
    }
  });

  console.log('\n' + '=' .repeat(80));
  console.log('📊 VERIFICATION RESULTS:');
  console.log('=' .repeat(80));
  console.log(`Churches with root-level coordinates: ${withRootCoordinates}`);
  console.log(`Churches without coordinates:         ${withoutCoordinates}`);
  console.log('=' .repeat(80));
  console.log('\n✨ Verification complete!');
}

// Run the migration
migrateCoordinates();
