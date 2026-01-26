#!/usr/bin/env node

/**
 * Data seeding script for VISITA development environment
 * Seeds Firestore with sample data for testing and development
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Sample data
const sampleData = {
  users: [
    {
      uid: 'chancery_tagbilaran_001',
      email: 'dioceseoftagbilaran1941@gmail.com',
      name: 'Tagbilaran Chancery Office',
      role: 'chancery_office',
      diocese: 'tagbilaran',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2024-01-01'),
    },
    {
      uid: 'chancery_talibon_001',
      email: 'chancery.talibon@visita.ph',
      name: 'Talibon Chancery Office',
      role: 'chancery_office',
      diocese: 'talibon',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2024-01-01'),
    },
    {
      uid: 'museum_researcher_001',
      email: 'researcher@museum.gov.ph',
      name: 'Dr. Heritage Researcher',
      role: 'museum_researcher',
      diocese: 'tagbilaran', // Default assignment
      isActive: true,
      isVerified: true,
      createdAt: new Date('2024-01-15'),
    },
    {
      uid: 'parish_baclayon_001',
      email: 'secretary@baclayon.church',
      name: 'Sister Catherine Cruz',
      role: 'parish_secretary',
      diocese: 'tagbilaran',
      parish: 'Baclayon Church',
      isActive: true,
      isVerified: true,
      createdAt: new Date('2024-02-01'),
    }
  ],

  churches: [
    {
      id: 'church_baclayon',
      name: 'Baclayon Church',
      description: 'The oldest stone church in the Philippines, built by the Jesuits in 1596.',
      municipality: 'Baclayon',
      province: 'Bohol',
      address: 'Baclayon, Bohol, Philippines',
      coordinates: {
        latitude: 9.6187,
        longitude: 123.9047
      },
      diocese: 'tagbilaran',
      parish: 'Baclayon Church',
      foundingYear: 1596,
      founders: 'Spanish Jesuit missionaries',
      historicalSignificance: 'Oldest stone church in the Philippines, National Cultural Treasure',
      architecturalStyle: 'Spanish Colonial',
      heritageClassification: 'NCT',
      heritageDeclaration: {
        number: 'NCT-001',
        date: new Date('2010-08-16').toISOString(),
        description: 'Declared as National Cultural Treasure for its historical and architectural significance'
      },
      massSchedule: [
        { day: 'Sunday', time: '06:00', type: 'Regular' },
        { day: 'Sunday', time: '08:00', type: 'Regular' },
        { day: 'Monday', time: '06:00', type: 'Regular' },
        { day: 'Wednesday', time: '06:00', type: 'Regular' },
        { day: 'Friday', time: '06:00', type: 'Regular' }
      ],
      contactInfo: {
        phone: '+639171234567',
        email: 'baclayon@church.ph'
      },
      priest: {
        name: 'Rev. Fr. Juan dela Cruz',
        title: 'Rev. Fr.',
        contactInfo: {
          phone: '+639171234567',
          email: 'fr.delacruz@church.ph'
        }
      },
      images: [
        {
          url: 'https://example.com/baclayon-exterior.jpg',
          caption: 'Baclayon Church exterior facade',
          type: 'exterior',
          isPrimary: true
        }
      ],
      status: 'approved',
      createdBy: 'parish_baclayon_001',
      createdAt: new Date('2024-02-15'),
      approvedAt: new Date('2024-02-20')
    },
    {
      id: 'church_loboc',
      name: 'Loboc Church',
      description: 'Historic church known for its beautiful riverside location and musical tradition.',
      municipality: 'Loboc',
      province: 'Bohol',
      address: 'Loboc, Bohol, Philippines',
      coordinates: {
        latitude: 9.6389,
        longitude: 124.0311
      },
      diocese: 'tagbilaran',
      parish: 'Loboc Church',
      foundingYear: 1602,
      founders: 'Spanish Jesuit missionaries',
      historicalSignificance: 'Famous for its musical tradition and riverside location',
      architecturalStyle: 'Spanish Colonial',
      heritageClassification: 'ICP',
      heritageDeclaration: {
        number: 'ICP-023',
        date: new Date('2015-05-12').toISOString(),
        description: 'Important Cultural Property for its cultural and historical value'
      },
      massSchedule: [
        { day: 'Sunday', time: '07:00', type: 'Regular' },
        { day: 'Sunday', time: '09:00', type: 'Regular' },
        { day: 'Tuesday', time: '06:00', type: 'Regular' },
        { day: 'Thursday', time: '06:00', type: 'Regular' }
      ],
      status: 'approved',
      createdBy: 'chancery_tagbilaran_001',
      createdAt: new Date('2024-03-01'),
      approvedAt: new Date('2024-03-05')
    },
    {
      id: 'church_maribojoc',
      name: 'Maribojoc Church',
      description: 'Historic church damaged by earthquake in 2013, currently under restoration.',
      municipality: 'Maribojoc',
      province: 'Bohol',
      address: 'Maribojoc, Bohol, Philippines',
      coordinates: {
        latitude: 9.7331,
        longitude: 123.8289
      },
      diocese: 'tagbilaran',
      parish: 'Maribojoc Church',
      foundingYear: 1767,
      historicalSignificance: 'Baroque church with unique architectural features',
      architecturalStyle: 'Baroque',
      heritageClassification: 'ICP',
      status: 'heritage_review',
      createdBy: 'chancery_tagbilaran_001',
      createdAt: new Date('2024-03-10'),
      reviewNotes: 'Under review for heritage classification after restoration'
    },
    {
      id: 'church_tubigon',
      name: 'Tubigon Church',
      description: 'Parish church serving the municipality of Tubigon.',
      municipality: 'Tubigon',
      province: 'Bohol',
      address: 'Tubigon, Bohol, Philippines',
      coordinates: {
        latitude: 10.0464,
        longitude: 124.0331
      },
      diocese: 'talibon',
      parish: 'Tubigon Church',
      foundingYear: 1870,
      architecturalStyle: 'Modern Filipino',
      heritageClassification: 'none',
      massSchedule: [
        { day: 'Sunday', time: '06:00', type: 'Regular' },
        { day: 'Sunday', time: '08:00', type: 'Regular' },
        { day: 'Sunday', time: '17:00', type: 'Evening' }
      ],
      status: 'pending',
      createdBy: 'chancery_talibon_001',
      createdAt: new Date('2024-03-15')
    }
  ],

  announcements: [
    {
      id: 'announcement_001',
      title: 'Holy Week Observance 2024',
      content: 'Join us for the Holy Week observance from March 24-31, 2024. Special masses and processions will be held across all parishes in the Diocese of Tagbilaran.',
      summary: 'Holy Week celebration schedule for all parishes',
      type: 'event',
      priority: 'high',
      scope: 'diocese',
      diocese: 'tagbilaran',
      targetAudience: ['parishioners', 'visitors'],
      eventDetails: {
        startDate: new Date('2024-03-24').toISOString(),
        endDate: new Date('2024-03-31').toISOString(),
        venue: 'All parishes in Tagbilaran Diocese'
      },
      status: 'published',
      publishedAt: new Date('2024-03-01'),
      isPinned: true,
      createdBy: 'chancery_tagbilaran_001',
      createdAt: new Date('2024-03-01')
    },
    {
      id: 'announcement_002',
      title: 'Baclayon Church Heritage Tour',
      content: 'Special guided tours of Baclayon Church every Saturday at 10:00 AM and 2:00 PM. Learn about the rich history of the oldest stone church in the Philippines.',
      summary: 'Weekly heritage tours at Baclayon Church',
      type: 'general',
      priority: 'normal',
      scope: 'parish',
      diocese: 'tagbilaran',
      parish: 'Baclayon Church',
      targetAudience: ['visitors', 'tourists'],
      status: 'published',
      publishedAt: new Date('2024-02-25'),
      createdBy: 'parish_baclayon_001',
      createdAt: new Date('2024-02-25')
    },
    {
      id: 'announcement_003',
      title: 'Earthquake Damage Assessment',
      content: 'The National Museum team will conduct structural assessment of heritage churches affected by recent seismic activity. Temporary access restrictions may apply.',
      summary: 'Heritage church assessment by National Museum',
      type: 'maintenance',
      priority: 'urgent',
      scope: 'diocese',
      diocese: 'tagbilaran',
      targetAudience: ['staff', 'parishioners'],
      status: 'published',
      publishedAt: new Date('2024-03-20'),
      createdBy: 'museum_researcher_001',
      createdAt: new Date('2024-03-20'),
      tags: ['heritage', 'assessment', 'safety']
    }
  ],

  feedback: [
    {
      id: 'feedback_001',
      churchId: 'church_baclayon',
      userId: 'public_user_001',
      userName: 'Maria Rodriguez',
      rating: 5,
      comment: 'Amazing historical church! The guided tour was very informative. A must-visit for anyone interested in Philippine history.',
      images: [],
      status: 'approved',
      createdAt: new Date('2024-03-18'),
      diocese: 'tagbilaran'
    },
    {
      id: 'feedback_002',
      churchId: 'church_loboc',
      userId: 'public_user_002',
      userName: 'John Smith',
      rating: 4,
      comment: 'Beautiful church with great acoustics. The riverside location is peaceful. Would love to hear the famous choir perform.',
      images: [],
      status: 'approved',
      createdAt: new Date('2024-03-16'),
      diocese: 'tagbilaran'
    }
  ]
};

class DataSeeder {
  constructor() {
    this.db = null;
  }

  async initialize() {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
        path.join(__dirname, '../admin-dashboard/firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      } else {
        console.log('⚠️ Firebase service account not found. Using default credentials.');
        admin.initializeApp();
      }
      
      this.db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
      throw error;
    }
  }

  async seedCollection(collectionName, data) {
    console.log(`📝 Seeding ${collectionName} collection...`);
    
    const batch = this.db.batch();
    let count = 0;
    
    for (const item of data) {
      const docRef = this.db.collection(collectionName).doc(item.id || item.uid);
      
      // Remove id field if it exists (Firestore uses document ID)
      const { id, uid, ...docData } = item;
      
      // Convert Date objects to Firestore Timestamps
      const processedData = this.convertDatesToTimestamps(docData);
      
      batch.set(docRef, processedData);
      count++;
    }
    
    await batch.commit();
    console.log(`✅ Seeded ${count} documents in ${collectionName}`);
  }

  convertDatesToTimestamps(obj) {
    if (obj instanceof Date) {
      return admin.firestore.Timestamp.fromDate(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDatesToTimestamps(item));
    }
    
    if (obj && typeof obj === 'object') {
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = this.convertDatesToTimestamps(value);
      }
      return converted;
    }
    
    return obj;
  }

  async clearCollection(collectionName) {
    console.log(`🗑️ Clearing ${collectionName} collection...`);
    
    const snapshot = await this.db.collection(collectionName).get();
    const batch = this.db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (snapshot.docs.length > 0) {
      await batch.commit();
      console.log(`✅ Cleared ${snapshot.docs.length} documents from ${collectionName}`);
    } else {
      console.log(`ℹ️ Collection ${collectionName} is already empty`);
    }
  }

  async seedAll(clearFirst = false) {
    console.log('🌱 Starting data seeding process...');
    
    const collections = [
      { name: 'users', data: sampleData.users },
      { name: 'churches', data: sampleData.churches },
      { name: 'announcements', data: sampleData.announcements },
      { name: 'feedback', data: sampleData.feedback }
    ];
    
    for (const collection of collections) {
      if (clearFirst) {
        await this.clearCollection(collection.name);
      }
      await this.seedCollection(collection.name, collection.data);
    }
    
    console.log('✅ Data seeding completed successfully!');
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');
    
    // Note: Firestore indexes are typically created through the Firebase Console
    // or firestore.indexes.json file. This is a placeholder for index creation logic.
    
    const indexRequests = [
      // Churches indexes
      { collection: 'churches', fields: ['diocese', 'status'] },
      { collection: 'churches', fields: ['municipality', 'status'] },
      { collection: 'churches', fields: ['heritageClassification', 'status'] },
      { collection: 'churches', fields: ['createdAt', 'status'] },
      
      // Announcements indexes
      { collection: 'announcements', fields: ['diocese', 'status', 'publishedAt'] },
      { collection: 'announcements', fields: ['scope', 'status', 'publishedAt'] },
      { collection: 'announcements', fields: ['priority', 'status', 'publishedAt'] },
      
      // Feedback indexes
      { collection: 'feedback', fields: ['churchId', 'status', 'createdAt'] },
      { collection: 'feedback', fields: ['diocese', 'status', 'rating'] }
    ];
    
    console.log(`ℹ️ ${indexRequests.length} indexes should be created through Firebase Console`);
    console.log('Visit: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const clearFirst = args.includes('--clear');
  const indexesOnly = args.includes('--indexes-only');
  
  console.log('🚀 VISITA Data Seeding Tool');
  console.log('============================');
  
  try {
    const seeder = new DataSeeder();
    await seeder.initialize();
    
    if (indexesOnly) {
      await seeder.createIndexes();
    } else {
      await seeder.seedAll(clearFirst);
      await seeder.createIndexes();
    }
    
    console.log('');
    console.log('🎉 Seeding process completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`• ${sampleData.users.length} user accounts created`);
    console.log(`• ${sampleData.churches.length} churches added`);
    console.log(`• ${sampleData.announcements.length} announcements posted`);
    console.log(`• ${sampleData.feedback.length} feedback entries added`);
    console.log('');
    console.log('🔐 Test login credentials:');
    console.log('• Tagbilaran Chancery: dioceseoftagbilaran1941@gmail.com');
    console.log('• Talibon Chancery: chancery.talibon@visita.ph');
    console.log('• Museum Researcher: researcher@museum.gov.ph');
    console.log('• Parish Secretary: secretary@baclayon.church');
    console.log('');
    console.log('Note: You need to set passwords for these accounts in Firebase Auth console');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { DataSeeder, sampleData };