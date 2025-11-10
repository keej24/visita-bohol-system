/**
 * Church Coordinate Verification Script
 *
 * This script checks all churches in Firestore and verifies:
 * 1. Which churches have valid coordinates
 * 2. Which churches are missing coordinates
 * 3. Whether coordinates are in valid ranges (lat: -90 to 90, lng: -180 to 180)
 * 4. Whether coordinates point to reasonable locations (Bohol, Philippines area)
 * 5. Lists all churches with their coordinate data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Bohol, Philippines approximate bounds for validation
const BOHOL_BOUNDS = {
  minLat: 9.4,    // Southern tip
  maxLat: 10.2,   // Northern tip
  minLng: 123.7,  // Western edge
  maxLng: 124.7   // Eastern edge
};

async function verifyChurchCoordinates() {
  console.log('🔍 Fetching all churches from Firestore...\n');

  try {
    const churchesSnapshot = await db.collection('churches').get();

    if (churchesSnapshot.empty) {
      console.log('❌ No churches found in the database!');
      return;
    }

    console.log(`📊 Total churches found: ${churchesSnapshot.size}\n`);
    console.log('=' .repeat(80));

    const results = {
      total: 0,
      withCoordinates: 0,
      withoutCoordinates: 0,
      invalidCoordinates: 0,
      outsideBohol: 0,
      churches: []
    };

    churchesSnapshot.forEach((doc) => {
      const church = doc.data();
      const churchId = doc.id;
      results.total++;

      const analysis = {
        id: churchId,
        name: church.name || 'Unknown',
        latitude: church.latitude,
        longitude: church.longitude,
        hasCoordinates: false,
        isValid: false,
        inBohol: false,
        issues: []
      };

      // Check if coordinates exist
      if (church.latitude != null && church.longitude != null) {
        analysis.hasCoordinates = true;
        results.withCoordinates++;

        const lat = parseFloat(church.latitude);
        const lng = parseFloat(church.longitude);

        // Validate coordinate ranges
        if (isNaN(lat) || isNaN(lng)) {
          analysis.issues.push('Invalid number format');
          results.invalidCoordinates++;
        } else if (lat < -90 || lat > 90) {
          analysis.issues.push(`Latitude out of range: ${lat}`);
          results.invalidCoordinates++;
        } else if (lng < -180 || lng > 180) {
          analysis.issues.push(`Longitude out of range: ${lng}`);
          results.invalidCoordinates++;
        } else {
          analysis.isValid = true;

          // Check if within Bohol bounds
          if (lat >= BOHOL_BOUNDS.minLat && lat <= BOHOL_BOUNDS.maxLat &&
              lng >= BOHOL_BOUNDS.minLng && lng <= BOHOL_BOUNDS.maxLng) {
            analysis.inBohol = true;
          } else {
            analysis.issues.push(`Outside Bohol bounds (${lat}, ${lng})`);
            results.outsideBohol++;
          }
        }
      } else {
        analysis.issues.push('Missing latitude or longitude');
        results.withoutCoordinates++;
      }

      results.churches.push(analysis);
    });

    // Print Summary
    console.log('\n📈 SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`Total Churches:           ${results.total}`);
    console.log(`✅ With Coordinates:      ${results.withCoordinates} (${((results.withCoordinates/results.total)*100).toFixed(1)}%)`);
    console.log(`❌ Without Coordinates:   ${results.withoutCoordinates} (${((results.withoutCoordinates/results.total)*100).toFixed(1)}%)`);
    console.log(`⚠️  Invalid Coordinates:   ${results.invalidCoordinates}`);
    console.log(`🗺️  Outside Bohol:        ${results.outsideBohol}`);
    console.log('=' .repeat(80));

    // Print churches without coordinates
    if (results.withoutCoordinates > 0) {
      console.log('\n❌ CHURCHES WITHOUT COORDINATES:');
      console.log('=' .repeat(80));
      results.churches
        .filter(c => !c.hasCoordinates)
        .forEach(church => {
          console.log(`\n📍 ${church.name}`);
          console.log(`   ID: ${church.id}`);
          console.log(`   Issues: ${church.issues.join(', ')}`);
        });
    }

    // Print churches with invalid coordinates
    if (results.invalidCoordinates > 0) {
      console.log('\n⚠️  CHURCHES WITH INVALID COORDINATES:');
      console.log('=' .repeat(80));
      results.churches
        .filter(c => c.hasCoordinates && !c.isValid)
        .forEach(church => {
          console.log(`\n📍 ${church.name}`);
          console.log(`   ID: ${church.id}`);
          console.log(`   Lat: ${church.latitude}, Lng: ${church.longitude}`);
          console.log(`   Issues: ${church.issues.join(', ')}`);
        });
    }

    // Print churches outside Bohol
    if (results.outsideBohol > 0) {
      console.log('\n🗺️  CHURCHES OUTSIDE BOHOL BOUNDS:');
      console.log('=' .repeat(80));
      results.churches
        .filter(c => c.isValid && !c.inBohol)
        .forEach(church => {
          console.log(`\n📍 ${church.name}`);
          console.log(`   ID: ${church.id}`);
          console.log(`   Lat: ${church.latitude}, Lng: ${church.longitude}`);
          console.log(`   Google Maps: https://www.google.com/maps?q=${church.latitude},${church.longitude}`);
        });
    }

    // Print all churches with valid coordinates
    console.log('\n✅ ALL CHURCHES WITH COORDINATES:');
    console.log('=' .repeat(80));
    results.churches
      .filter(c => c.hasCoordinates)
      .forEach(church => {
        const status = church.isValid && church.inBohol ? '✅' :
                      church.isValid ? '⚠️' : '❌';
        console.log(`\n${status} ${church.name}`);
        console.log(`   ID: ${church.id}`);
        console.log(`   Lat: ${church.latitude}, Lng: ${church.longitude}`);
        if (church.issues.length > 0) {
          console.log(`   Issues: ${church.issues.join(', ')}`);
        }
        if (church.isValid) {
          console.log(`   Google Maps: https://www.google.com/maps?q=${church.latitude},${church.longitude}`);
        }
      });

    console.log('\n' + '=' .repeat(80));
    console.log('✨ Verification complete!');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error fetching churches:', error);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the verification
verifyChurchCoordinates();
