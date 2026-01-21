/**
 * Check Photo Visibility in Firestore
 * 
 * This script checks what photo data is stored in Firestore to debug
 * why internal photos might still be showing in the mobile app.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccountPath = '../admin-dashboard/firebase-service-account.json';
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkPhotoVisibility() {
  console.log('🔍 Checking photo visibility in Firestore...\n');
  
  try {
    const churchesSnapshot = await db.collection('churches').get();
    
    console.log(`Found ${churchesSnapshot.size} churches\n`);
    
    for (const doc of churchesSnapshot.docs) {
      const data = doc.data();
      const name = data.name || doc.id;
      
      console.log(`\n📍 Church: ${name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Status: ${data.status}`);
      
      // Check 'images' field (legacy)
      if (data.images) {
        console.log(`   📷 'images' field (legacy):`);
        if (Array.isArray(data.images)) {
          data.images.forEach((img, i) => {
            if (typeof img === 'string') {
              console.log(`      [${i}] String: ${img.substring(0, 60)}...`);
            } else {
              console.log(`      [${i}] Object:`, JSON.stringify(img, null, 2).substring(0, 100));
            }
          });
        } else {
          console.log(`      Type: ${typeof data.images}`);
        }
      } else {
        console.log(`   📷 'images' field: NOT PRESENT`);
      }
      
      // Check 'photos' field (new with visibility)
      if (data.photos) {
        console.log(`   📸 'photos' field (with visibility):`);
        if (Array.isArray(data.photos)) {
          data.photos.forEach((photo, i) => {
            if (typeof photo === 'string') {
              console.log(`      [${i}] String (legacy): ${photo.substring(0, 60)}...`);
            } else if (typeof photo === 'object') {
              console.log(`      [${i}] Object:`);
              console.log(`          visibility: ${photo.visibility || 'NOT SET'}`);
              console.log(`          name: ${photo.name || 'NOT SET'}`);
              console.log(`          url: ${(photo.url || '').substring(0, 60)}...`);
            }
          });
        } else {
          console.log(`      Type: ${typeof data.photos}`);
        }
      } else {
        console.log(`   📸 'photos' field: NOT PRESENT`);
      }
      
      console.log('   ---');
    }
    
    console.log('\n✅ Done checking photo visibility');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkPhotoVisibility();
