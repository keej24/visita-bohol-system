/**
 * Script to check pending user registrations in Firestore
 * Run with: node check-pending-users.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccountPath = path.join(__dirname, '../admin-dashboard/firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error('❌ Could not load service account. Make sure firebase-service-account.json exists.');
  process.exit(1);
}

const db = admin.firestore();

async function checkPendingUsers() {
  console.log('🔍 Checking for pending user registrations...\n');

  try {
    // Query 1: All users with status='pending'
    console.log('--- Query: All users with status="pending" ---');
    const pendingQuery = await db.collection('users')
      .where('status', '==', 'pending')
      .get();
    
    console.log(`Found ${pendingQuery.size} pending users:\n`);
    
    pendingQuery.forEach(doc => {
      const data = doc.data();
      console.log(`  📧 ${data.email || 'No email'}`);
      console.log(`     UID: ${doc.id}`);
      console.log(`     Name: ${data.name || 'N/A'}`);
      console.log(`     Role: ${data.role || 'N/A'}`);
      console.log(`     Diocese: ${data.diocese || 'N/A'}`);
      console.log(`     Status: ${data.status}`);
      console.log(`     CreatedAt: ${data.createdAt?.toDate?.() || data.createdAt || 'N/A'}`);
      console.log('');
    });

    // Query 2: All chancery_office users
    console.log('\n--- Query: All chancery_office users ---');
    const chanceryQuery = await db.collection('users')
      .where('role', '==', 'chancery_office')
      .get();
    
    console.log(`Found ${chanceryQuery.size} chancery users:\n`);
    
    chanceryQuery.forEach(doc => {
      const data = doc.data();
      console.log(`  📧 ${data.email || 'No email'}`);
      console.log(`     UID: ${doc.id}`);
      console.log(`     Name: ${data.name || 'N/A'}`);
      console.log(`     Diocese: ${data.diocese || 'N/A'}`);
      console.log(`     Status: ${data.status || 'N/A'}`);
      console.log('');
    });

    // Query 3: All museum_researcher users  
    console.log('\n--- Query: All museum_researcher users ---');
    const museumQuery = await db.collection('users')
      .where('role', '==', 'museum_researcher')
      .get();
    
    console.log(`Found ${museumQuery.size} museum researcher users:\n`);
    
    museumQuery.forEach(doc => {
      const data = doc.data();
      console.log(`  📧 ${data.email || 'No email'}`);
      console.log(`     UID: ${doc.id}`);
      console.log(`     Name: ${data.name || 'N/A'}`);
      console.log(`     Status: ${data.status || 'N/A'}`);
      console.log('');
    });

    // Query 4: All parish users
    console.log('\n--- Query: All parish users ---');
    const parishQuery = await db.collection('users')
      .where('role', '==', 'parish')
      .get();
    
    console.log(`Found ${parishQuery.size} parish secretary users:\n`);
    
    parishQuery.forEach(doc => {
      const data = doc.data();
      console.log(`  📧 ${data.email || 'No email'}`);
      console.log(`     UID: ${doc.id}`);
      console.log(`     Name: ${data.name || 'N/A'}`);
      console.log(`     Diocese: ${data.diocese || 'N/A'}`);
      console.log(`     Parish: ${data.parishName || data.parish || 'N/A'}`);
      console.log(`     Status: ${data.status || 'N/A'}`);
      console.log('');
    });

    // Query 5: Check all users' statuses
    console.log('\n--- Summary: All user statuses ---');
    const allUsers = await db.collection('users').get();
    const statusCount = {};
    
    allUsers.forEach(doc => {
      const status = doc.data().status || 'undefined';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    console.log(`Total users: ${allUsers.size}`);
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (err) {
    console.error('❌ Error querying Firestore:', err.message);
  }

  process.exit(0);
}

checkPendingUsers();
