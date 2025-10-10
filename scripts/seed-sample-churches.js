const admin = require('firebase-admin');

// Sample Churches Data for Bohol
const sampleChurches = [
  // Diocese of Tagbilaran Churches
  {
    id: 'baclayon-church',
    name: 'Our Lady of the Immaculate Conception Church',
    location: 'Baclayon, Bohol',
    diocese: 'tagbilaran',
    latitude: 9.6239,
    longitude: 123.9086,
    foundingYear: 1596,
    architecturalStyle: 'baroque',
    heritageClassification: 'icp',
    history: 'One of the oldest churches in the Philippines, built by the Jesuit missionaries. It houses a museum with religious artifacts and centuries-old ecclesiastical objects.',
    images: [
      'https://example.com/baclayon1.jpg',
      'https://example.com/baclayon2.jpg'
    ],
    isHeritage: true,
    status: 'approved',
    culturalSignificance: 'National Cultural Treasure',
    massSchedules: [
      { day: 'Sunday', time: '6:00 AM', language: 'English' },
      { day: 'Sunday', time: '8:00 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '10:00 AM', language: 'English' },
      { day: 'Sunday', time: '5:00 PM', language: 'Cebuano' }
    ],
    priest: 'Fr. John Doe',
    contactInfo: {
      phone: '+63 38 540 9122',
      email: 'baclayon@diocese-tagbilaran.org'
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    id: 'loboc-church',
    name: 'San Pedro Apostol Church',
    location: 'Loboc, Bohol',
    diocese: 'tagbilaran',
    latitude: 9.6403,
    longitude: 124.0317,
    foundingYear: 1602,
    architecturalStyle: 'baroque',
    heritageClassification: 'icp',
    history: 'Founded by the Jesuit missionaries, this church is famous for its wooden choir loft and historical significance in Bohol evangelization.',
    images: [
      'https://example.com/loboc1.jpg',
      'https://example.com/loboc2.jpg'
    ],
    isHeritage: true,
    status: 'approved',
    culturalSignificance: 'Important Cultural Property',
    massSchedules: [
      { day: 'Sunday', time: '7:00 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '9:00 AM', language: 'English' },
      { day: 'Sunday', time: '4:00 PM', language: 'Cebuano' }
    ],
    priest: 'Fr. Pedro Santos',
    contactInfo: {
      phone: '+63 38 537 9045',
      email: 'loboc@diocese-tagbilaran.org'
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    id: 'tagbilaran-cathedral',
    name: 'Cathedral of St. Joseph the Worker',
    location: 'Tagbilaran City, Bohol',
    diocese: 'tagbilaran',
    latitude: 9.6496,
    longitude: 123.8548,
    foundingYear: 1595,
    architecturalStyle: 'modern',
    heritageClassification: 'none',
    history: 'The cathedral church of the Diocese of Tagbilaran, dedicated to St. Joseph the Worker. It serves as the mother church of all parishes in the diocese.',
    images: [
      'https://example.com/tagbilaran-cathedral1.jpg',
      'https://example.com/tagbilaran-cathedral2.jpg'
    ],
    isHeritage: false,
    status: 'approved',
    massSchedules: [
      { day: 'Sunday', time: '5:30 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '7:00 AM', language: 'English' },
      { day: 'Sunday', time: '8:30 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '10:00 AM', language: 'English' },
      { day: 'Sunday', time: '5:00 PM', language: 'Cebuano' },
      { day: 'Sunday', time: '6:30 PM', language: 'English' }
    ],
    priest: 'Most Rev. Alberto Uy (Bishop)',
    contactInfo: {
      phone: '+63 38 411 3204',
      email: 'cathedral@diocese-tagbilaran.org'
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    id: 'dauis-church',
    name: 'Our Lady of the Assumption Church',
    location: 'Dauis, Bohol',
    diocese: 'tagbilaran',
    latitude: 9.6142,
    longitude: 123.8431,
    foundingYear: 1697,
    architecturalStyle: 'baroque',
    heritageClassification: 'icp',
    history: 'Known for its miraculous well and the devotion to Our Lady of the Assumption. The church features beautiful baroque architecture typical of the Spanish colonial period.',
    images: [
      'https://example.com/dauis1.jpg',
      'https://example.com/dauis2.jpg'
    ],
    isHeritage: true,
    status: 'approved',
    culturalSignificance: 'Important Cultural Property',
    massSchedules: [
      { day: 'Sunday', time: '6:00 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '8:00 AM', language: 'English' },
      { day: 'Sunday', time: '10:00 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '5:00 PM', language: 'English' }
    ],
    priest: 'Fr. Maria Gonzalez',
    contactInfo: {
      phone: '+63 38 540 9134',
      email: 'dauis@diocese-tagbilaran.org'
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },

  // Diocese of Talibon Churches
  {
    id: 'talibon-cathedral',
    name: 'Cathedral of St. Michael the Archangel',
    location: 'Talibon, Bohol',
    diocese: 'talibon',
    latitude: 10.0897,
    longitude: 124.3158,
    foundingYear: 1871,
    architecturalStyle: 'neoclassical',
    heritageClassification: 'none',
    history: 'The cathedral church of the Diocese of Talibon, dedicated to St. Michael the Archangel. It serves as the episcopal seat and mother church of the northern Bohol parishes.',
    images: [
      'https://example.com/talibon-cathedral1.jpg',
      'https://example.com/talibon-cathedral2.jpg'
    ],
    isHeritage: false,
    status: 'approved',
    massSchedules: [
      { day: 'Sunday', time: '6:00 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '8:00 AM', language: 'English' },
      { day: 'Sunday', time: '10:00 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '5:00 PM', language: 'English' }
    ],
    priest: 'Most Rev. Patrick Daniel Parcon (Bishop)',
    contactInfo: {
      phone: '+63 38 508 8234',
      email: 'cathedral@diocese-talibon.org'
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  },
  {
    id: 'bien-unido-church',
    name: 'San Isidro Labrador Church',
    location: 'Bien Unido, Bohol',
    diocese: 'talibon',
    latitude: 10.1475,
    longitude: 124.3603,
    foundingYear: 1950,
    architecturalStyle: 'modern',
    heritageClassification: 'none',
    history: 'A relatively modern church serving the coastal municipality of Bien Unido, dedicated to San Isidro Labrador, patron saint of farmers.',
    images: [
      'https://example.com/bien-unido1.jpg'
    ],
    isHeritage: false,
    status: 'approved',
    massSchedules: [
      { day: 'Sunday', time: '7:00 AM', language: 'Cebuano' },
      { day: 'Sunday', time: '9:00 AM', language: 'English' },
      { day: 'Sunday', time: '4:00 PM', language: 'Cebuano' }
    ],
    priest: 'Fr. Isidro Cruz',
    contactInfo: {
      phone: '+63 38 508 7045',
      email: 'bienunido@diocese-talibon.org'
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  }
];

// Sample Announcements
const sampleAnnouncements = [
  {
    id: 'diocese-tagbilaran-lent-2024',
    title: 'Lenten Season 2024 - Diocese of Tagbilaran',
    description: 'Join us for the Holy Week celebrations across all parishes in the Diocese of Tagbilaran. Special masses and processions will be held.',
    scope: 'diocese',
    diocese: 'tagbilaran',
    dateTime: new Date('2024-03-24T18:00:00'),
    venue: 'All Parishes - Diocese of Tagbilaran',
    createdBy: 'diocese-tagbilaran-admin',
    isActive: true,
    createdAt: admin.firestore.Timestamp.now()
  },
  {
    id: 'diocese-talibon-feast-2024',
    title: 'Feast of St. Michael the Archangel',
    description: 'Celebrate the feast day of our cathedral patron saint with special masses and community activities.',
    scope: 'diocese',
    diocese: 'talibon',
    dateTime: new Date('2024-09-29T10:00:00'),
    venue: 'Cathedral of St. Michael the Archangel, Talibon',
    createdBy: 'diocese-talibon-admin',
    isActive: true,
    createdAt: admin.firestore.Timestamp.now()
  }
];

// Initialize Firebase Admin (you need to call this with proper service account)
async function seedSampleData() {
  try {
    console.log('🌱 Starting to seed sample church data...');

    const db = admin.firestore();

    // Seed churches
    console.log('📍 Seeding churches...');
    for (const church of sampleChurches) {
      await db.collection('churches').doc(church.id).set(church);
      console.log(`✅ Added church: ${church.name}`);
    }

    // Seed announcements
    console.log('📢 Seeding announcements...');
    for (const announcement of sampleAnnouncements) {
      await db.collection('announcements').doc(announcement.id).set(announcement);
      console.log(`✅ Added announcement: ${announcement.title}`);
    }

    console.log('🎉 Sample data seeding completed successfully!');
    console.log(`📊 Seeded ${sampleChurches.length} churches and ${sampleAnnouncements.length} announcements`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
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

  seedSampleData().catch(console.error);
}

module.exports = { seedSampleData, sampleChurches, sampleAnnouncements };