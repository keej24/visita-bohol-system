/**
 * Simple script to verify notifications exist and can be queried
 * Run with: node scripts/verify-notifications.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function verifyNotifications() {
  console.log('🔔 Verifying Notifications...\n');

  // 1. Get all notifications
  console.log('1. Fetching all notifications...');
  const allNotifications = await db.collection('notifications').get();
  console.log(`   Total notifications: ${allNotifications.size}`);
  
  allNotifications.docs.forEach(doc => {
    const data = doc.data();
    console.log(`\n   📌 ID: ${doc.id}`);
    console.log(`      Type: ${data.type}`);
    console.log(`      Title: ${data.title}`);
    console.log(`      Recipient Roles: ${JSON.stringify(data.recipients?.roles)}`);
    console.log(`      Recipient Dioceses: ${JSON.stringify(data.recipients?.dioceses)}`);
    console.log(`      Created: ${data.createdAt?.toDate?.()?.toLocaleString() || 'pending'}`);
  });

  // 2. Query by role (how the app queries)
  console.log('\n\n2. Querying notifications for chancery_office role...');
  const roleQuery = await db.collection('notifications')
    .where('recipients.roles', 'array-contains', 'chancery_office')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  
  console.log(`   Found: ${roleQuery.size} notifications for chancery_office`);

  console.log('\n✅ Verification complete!');
}

verifyNotifications().catch(console.error);
