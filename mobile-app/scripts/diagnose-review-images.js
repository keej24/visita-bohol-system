/**
 * Diagnostic script to check review images in Firestore
 * This will help identify issues with image URLs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../admin-dashboard/firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  console.log('Please ensure firebase-service-account.json exists in admin-dashboard/');
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'visitaproject-5cd9f.appspot.com'
});

const db = admin.firestore();
const storage = admin.storage();

async function diagnoseReviewImages() {
  console.log('🔍 Starting diagnosis of review images...\n');

  try {
    // Get all feedback/reviews
    const feedbackSnapshot = await db.collection('feedback')
      .orderBy('date_submitted', 'desc')
      .limit(20)
      .get();

    console.log(`📊 Found ${feedbackSnapshot.size} recent reviews\n`);

    for (const doc of feedbackSnapshot.docs) {
      const data = doc.data();
      const photos = data.photos || data.images || [];

      if (photos.length > 0) {
        console.log(`\n📝 Review ID: ${doc.id}`);
        console.log(`   Church ID: ${data.church_id || data.churchId}`);
        console.log(`   User: ${data.pub_user_name || data.userName || 'Anonymous'}`);
        console.log(`   Photos count: ${photos.length}`);

        for (let i = 0; i < photos.length; i++) {
          const photoUrl = photos[i];
          console.log(`\n   📸 Photo ${i + 1}:`);
          console.log(`      URL: ${photoUrl}`);

          // Check URL format
          if (!photoUrl || photoUrl.trim() === '') {
            console.log(`      ❌ ISSUE: Empty URL`);
            continue;
          }

          if (photoUrl.includes('firebasestorage.googleapis.com')) {
            console.log(`      ✅ Valid Firebase Storage URL format`);

            // Check if it has a token
            if (photoUrl.includes('token=')) {
              console.log(`      ✅ Contains access token`);
            } else {
              console.log(`      ⚠️  WARNING: No access token found`);
            }

            // Extract path
            try {
              const urlObj = new URL(photoUrl);
              const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
              if (pathMatch) {
                const filePath = decodeURIComponent(pathMatch[1]);
                console.log(`      Storage path: ${filePath}`);

                // Check if file exists in storage
                try {
                  const bucket = storage.bucket();
                  const file = bucket.file(filePath);
                  const [exists] = await file.exists();

                  if (exists) {
                    console.log(`      ✅ File exists in storage`);

                    // Get file metadata
                    const [metadata] = await file.getMetadata();
                    console.log(`      Size: ${(metadata.size / 1024).toFixed(2)} KB`);
                    console.log(`      Content-Type: ${metadata.contentType}`);
                    console.log(`      Created: ${metadata.timeCreated}`);
                  } else {
                    console.log(`      ❌ ISSUE: File does NOT exist in storage`);
                  }
                } catch (err) {
                  console.log(`      ❌ ERROR checking file: ${err.message}`);
                }
              }
            } catch (err) {
              console.log(`      ⚠️  Could not parse URL: ${err.message}`);
            }
          } else if (photoUrl.startsWith('gs://')) {
            console.log(`      ⚠️  WARNING: GCS URL format (gs://) - should be HTTP URL`);
            console.log(`      This will NOT work in mobile app!`);
          } else {
            console.log(`      ❌ ISSUE: Unrecognized URL format`);
          }
        }

        console.log('\n   ' + '─'.repeat(60));
      }
    }

    console.log('\n\n✅ Diagnosis complete!');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }

  process.exit(0);
}

diagnoseReviewImages();
