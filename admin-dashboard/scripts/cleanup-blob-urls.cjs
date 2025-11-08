/**
 * Cleanup script to remove invalid blob URLs from feedback images
 * Blob URLs (blob:http://localhost:...) are temporary and don't work across sessions
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupBlobUrls() {
  console.log('🔍 Starting cleanup of blob URLs in feedback...\n');

  try {
    const feedbackSnapshot = await db.collection('feedback').get();
    console.log(`📊 Found ${feedbackSnapshot.size} feedback documents\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const doc of feedbackSnapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      let cleanedImages = [];
      let cleanedPhotos = [];

      // Check 'images' field
      if (data.images && Array.isArray(data.images)) {
        const validImages = data.images.filter(url => {
          if (typeof url === 'string' && url.startsWith('blob:')) {
            console.log(`   ❌ Found blob URL in ${doc.id}: ${url.substring(0, 50)}...`);
            return false; // Remove blob URLs
          }
          return true;
        });

        if (validImages.length !== data.images.length) {
          needsUpdate = true;
          cleanedImages = validImages;
          console.log(`   ✂️  Removed ${data.images.length - validImages.length} blob URLs from 'images'`);
        }
      }

      // Check 'photos' field
      if (data.photos && Array.isArray(data.photos)) {
        const validPhotos = data.photos.filter(url => {
          if (typeof url === 'string' && url.startsWith('blob:')) {
            console.log(`   ❌ Found blob URL in ${doc.id}: ${url.substring(0, 50)}...`);
            return false; // Remove blob URLs
          }
          return true;
        });

        if (validPhotos.length !== data.photos.length) {
          needsUpdate = true;
          cleanedPhotos = validPhotos;
          console.log(`   ✂️  Removed ${data.photos.length - validPhotos.length} blob URLs from 'photos'`);
        }
      }

      if (needsUpdate) {
        const updateData = {};
        if (data.images) updateData.images = cleanedImages;
        if (data.photos) updateData.photos = cleanedPhotos;

        await doc.ref.update(updateData);
        console.log(`   ✅ Updated feedback ${doc.id}\n`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} documents`);
    console.log(`   ⏭️  Skipped: ${skippedCount} documents (no blob URLs)`);
    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }

  process.exit(0);
}

cleanupBlobUrls();
