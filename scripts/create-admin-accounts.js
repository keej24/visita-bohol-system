const admin = require('firebase-admin');

// Admin accounts configuration
const adminAccounts = [
  {
    uid: 'chancery-tagbilaran-admin',
    email: 'admin@diocese-tagbilaran.org',
    password: 'VisitaAdmin2024!',
    displayName: 'Diocese of Tagbilaran Admin',
    profile: {
      role: 'chancery_office',
      name: 'Diocese of Tagbilaran Admin',
      diocese: 'tagbilaran',
      position: 'System Administrator',
      permissions: ['all'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      accountType: 'admin'
    }
  },
  {
    uid: 'chancery-talibon-admin',
    email: 'admin@diocese-talibon.org',
    password: 'VisitaAdmin2024!',
    displayName: 'Diocese of Talibon Admin',
    profile: {
      role: 'chancery_office',
      name: 'Diocese of Talibon Admin',
      diocese: 'talibon',
      position: 'System Administrator',
      permissions: ['all'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      accountType: 'admin'
    }
  },
  {
    uid: 'museum-researcher-admin',
    email: 'researcher@natmus-bohol.org',
    password: 'MuseumResearcher2024!',
    displayName: 'National Museum Researcher',
    profile: {
      role: 'museum_researcher',
      name: 'National Museum Researcher',
      institution: 'National Museum of the Philippines - Bohol',
      specialization: 'Cultural Heritage and Archaeology',
      permissions: ['heritage_validation', 'research_documentation'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      accountType: 'admin'
    }
  }
];

// Sample parish secretary accounts
const parishAccounts = [
  {
    uid: 'parish-baclayon-secretary',
    email: 'secretary@baclayon-church.org',
    password: 'BaclayonSecretary2024!',
    displayName: 'Baclayon Parish Secretary',
    profile: {
      role: 'parish_secretary',
      name: 'Baclayon Parish Secretary',
      diocese: 'tagbilaran',
      parish: 'baclayon-church',
      parishName: 'Our Lady of the Immaculate Conception Church',
      permissions: ['parish_management'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      accountType: 'admin'
    }
  },
  {
    uid: 'parish-loboc-secretary',
    email: 'secretary@loboc-church.org',
    password: 'LobocSecretary2024!',
    displayName: 'Loboc Parish Secretary',
    profile: {
      role: 'parish_secretary',
      name: 'Loboc Parish Secretary',
      diocese: 'tagbilaran',
      parish: 'loboc-church',
      parishName: 'San Pedro Apostol Church',
      permissions: ['parish_management'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      accountType: 'admin'
    }
  },
  {
    uid: 'parish-talibon-secretary',
    email: 'secretary@talibon-cathedral.org',
    password: 'TalibonSecretary2024!',
    displayName: 'Talibon Cathedral Secretary',
    profile: {
      role: 'parish_secretary',
      name: 'Talibon Cathedral Secretary',
      diocese: 'talibon',
      parish: 'talibon-cathedral',
      parishName: 'Cathedral of St. Michael the Archangel',
      permissions: ['parish_management'],
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      accountType: 'admin'
    }
  }
];

async function createAdminAccounts() {
  try {
    console.log('👥 Creating admin accounts...');

    const auth = admin.auth();
    const db = admin.firestore();

    // Create chancery and museum admin accounts
    for (const account of adminAccounts) {
      try {
        // Create Firebase Auth user
        await auth.createUser({
          uid: account.uid,
          email: account.email,
          password: account.password,
          displayName: account.displayName,
          emailVerified: true
        });

        // Create Firestore user profile with uid and email
        await db.collection('users').doc(account.uid).set({
          ...account.profile,
          uid: account.uid,
          email: account.email.toLowerCase(),
        });

        console.log(`✅ Created admin account: ${account.displayName} (${account.email})`);
      } catch (error) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`⚠️  Account already exists: ${account.displayName}`);
          // Update the profile in Firestore with correct fields
          await db.collection('users').doc(account.uid).set({
            ...account.profile,
            uid: account.uid,
            email: account.email.toLowerCase(),
          }, { merge: true });
        } else {
          throw error;
        }
      }
    }

    // Create parish secretary accounts
    console.log('\n📝 Creating parish secretary accounts...');
    for (const account of parishAccounts) {
      try {
        // Create Firebase Auth user
        await auth.createUser({
          uid: account.uid,
          email: account.email,
          password: account.password,
          displayName: account.displayName,
          emailVerified: true
        });

        // Create Firestore user profile with uid and email
        await db.collection('users').doc(account.uid).set({
          ...account.profile,
          uid: account.uid,
          email: account.email.toLowerCase(),
        });

        console.log(`✅ Created parish account: ${account.displayName} (${account.email})`);
      } catch (error) {
        if (error.code === 'auth/uid-already-exists') {
          console.log(`⚠️  Account already exists: ${account.displayName}`);
          // Update the profile in Firestore with correct fields
          await db.collection('users').doc(account.uid).set({
            ...account.profile,
            uid: account.uid,
            email: account.email.toLowerCase(),
          }, { merge: true });
        } else {
          throw error;
        }
      }
    }

    console.log('\n🎉 Admin accounts creation completed!');
    console.log('\n📋 Account Summary:');
    console.log('='.repeat(60));

    console.log('\n🏛️  CHANCERY OFFICE ACCOUNTS:');
    adminAccounts.filter(acc => acc.profile.role === 'chancery_office').forEach(acc => {
      console.log(`   📧 ${acc.email}`);
      console.log(`   🔑 ${acc.password}`);
      console.log(`   📍 ${acc.profile.diocese.toUpperCase()} Diocese`);
      console.log('   ---');
    });

    console.log('\n🏛️  MUSEUM RESEARCHER ACCOUNTS:');
    adminAccounts.filter(acc => acc.profile.role === 'museum_researcher').forEach(acc => {
      console.log(`   📧 ${acc.email}`);
      console.log(`   🔑 ${acc.password}`);
      console.log(`   🏛️  ${acc.profile.institution}`);
      console.log('   ---');
    });

    console.log('\n⛪ PARISH SECRETARY ACCOUNTS:');
    parishAccounts.forEach(acc => {
      console.log(`   📧 ${acc.email}`);
      console.log(`   🔑 ${acc.password}`);
      console.log(`   ⛪ ${acc.profile.parishName}`);
      console.log('   ---');
    });

    console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
    console.log('1. Change all default passwords after first login');
    console.log('2. These credentials are for initial setup only');
    console.log('3. Ensure proper password policies are enforced');
    console.log('4. Consider enabling 2FA for admin accounts');

  } catch (error) {
    console.error('❌ Error creating admin accounts:', error);
    throw error;
  }
}

if (require.main === module) {
  // Initialize Firebase Admin if running directly
  if (!admin.apps.length) {
    console.log('🔥 Initializing Firebase Admin...');
    const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
  }

  createAdminAccounts().catch(console.error);
}

module.exports = { createAdminAccounts, adminAccounts, parishAccounts };