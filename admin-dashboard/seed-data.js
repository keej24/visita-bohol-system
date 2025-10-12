#!/usr/bin/env node

/**
 * VISITA MVP - Seed Data Script
 * Creates initial data for MVP testing and demonstration
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'visitaproject-5cd9f'
});

const db = admin.firestore();

async function seedData() {
  console.log('🌱 Starting VISITA MVP data seeding...');

  try {
    // 1. Create Dioceses
    console.log('📍 Creating dioceses...');
    await Promise.all([
      db.collection('dioceses').doc('tagbilaran').set({
        id: 'tagbilaran',
        name: 'Diocese of Tagbilaran',
        bishop: 'Most Rev. Alberto Uy',
        established: '1968',
        cathedral: 'St. Joseph the Worker Cathedral',
        location: 'Tagbilaran City, Bohol',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }),

      db.collection('dioceses').doc('talibon').set({
        id: 'talibon',
        name: 'Diocese of Talibon',
        bishop: 'Most Rev. Daniel Parcon',
        established: '1986',
        cathedral: 'Our Lady of Mount Carmel Cathedral',
        location: 'Talibon, Bohol',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    ]);

    // 2. Create Admin Users (Chancery Offices)
    console.log('👤 Creating admin users...');
    await Promise.all([
      db.collection('users').doc('tagbilaran-admin').set({
        uid: 'tagbilaran-admin',
        email: 'chancery@tagbilaran.ph',
        displayName: 'Diocese of Tagbilaran Chancery',
        role: 'chancery_office',
        diocese: 'tagbilaran',
        department: 'Chancery Office',
        status: 'active',
        permissions: ['manage_parishes', 'approve_churches', 'manage_announcements', 'view_reports'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: null,
        profileComplete: true
      }),

      db.collection('users').doc('talibon-admin').set({
        uid: 'talibon-admin',
        email: 'chancery@talibon.ph',
        displayName: 'Diocese of Talibon Chancery',
        role: 'chancery_office',
        diocese: 'talibon',
        department: 'Chancery Office',
        status: 'active',
        permissions: ['manage_parishes', 'approve_churches', 'manage_announcements', 'view_reports'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: null,
        profileComplete: true
      })
    ]);

    // 3. Create Museum Researcher
    console.log('🏛️ Creating museum researcher...');
    await db.collection('users').doc('museum-researcher').set({
      uid: 'museum-researcher',
      email: 'researcher@museum.gov.ph',
      displayName: 'Dr. Heritage Researcher',
      role: 'museum_researcher',
      department: 'National Museum of the Philippines - Bohol',
      specialization: 'Heritage Churches and Cultural Sites',
      credentials: 'PhD in Art History, MA in Museum Studies',
      status: 'active',
      permissions: ['validate_heritage', 'edit_heritage_info', 'upload_declarations'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      profileComplete: true
    });

    // 4. Create Sample Parishes
    console.log('⛪ Creating parishes...');
    await Promise.all([
      db.collection('parishes').doc('tagbilaran-cathedral').set({
        id: 'tagbilaran-cathedral',
        name: 'St. Joseph the Worker Cathedral Parish',
        diocese: 'tagbilaran',
        municipality: 'Tagbilaran City',
        priest: 'Rev. Fr. Juan dela Cruz',
        contactNumber: '+63 38 411 2345',
        email: 'cathedral@tagbilaran.ph',
        address: 'CPG North Avenue, Tagbilaran City, Bohol',
        coordinates: {
          latitude: 9.6496,
          longitude: 123.8569
        },
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }),

      db.collection('parishes').doc('baclayon-church').set({
        id: 'baclayon-church',
        name: 'Our Lady of the Immaculate Conception Parish',
        diocese: 'tagbilaran',
        municipality: 'Baclayon',
        priest: 'Rev. Fr. Pedro Gonzales',
        contactNumber: '+63 38 412 3456',
        email: 'baclayon@tagbilaran.ph',
        address: 'Poblacion, Baclayon, Bohol',
        coordinates: {
          latitude: 9.6223,
          longitude: 123.9045
        },
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }),

      db.collection('parishes').doc('talibon-cathedral').set({
        id: 'talibon-cathedral',
        name: 'Our Lady of Mount Carmel Cathedral Parish',
        diocese: 'talibon',
        municipality: 'Talibon',
        priest: 'Rev. Fr. Miguel Rodriguez',
        contactNumber: '+63 38 515 1234',
        email: 'cathedral@talibon.ph',
        address: 'Poblacion, Talibon, Bohol',
        coordinates: {
          latitude: 10.1167,
          longitude: 124.2833
        },
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    ]);

    // 5. Create Parish Secretary Users
    console.log('📝 Creating parish secretaries...');
    await Promise.all([
      db.collection('users').doc('baclayon-secretary').set({
        uid: 'baclayon-secretary',
        email: 'secretary@baclayon.ph',
        displayName: 'Mrs. Elena Fernandez',
        role: 'parish_secretary',
        diocese: 'tagbilaran',
        parish: 'baclayon-church',
        parishName: 'Our Lady of the Immaculate Conception Parish',
        contactNumber: '+63 917 123 4567',
        status: 'active',
        permissions: ['edit_church_info', 'upload_images', 'manage_announcements'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: null,
        profileComplete: true
      }),

      db.collection('users').doc('talibon-secretary').set({
        uid: 'talibon-secretary',
        email: 'secretary@talibon.ph',
        displayName: 'Mr. Roberto Cruz',
        role: 'parish_secretary',
        diocese: 'talibon',
        parish: 'talibon-cathedral',
        parishName: 'Our Lady of Mount Carmel Cathedral Parish',
        contactNumber: '+63 917 234 5678',
        status: 'active',
        permissions: ['edit_church_info', 'upload_images', 'manage_announcements'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: null,
        profileComplete: true
      })
    ]);

    // 6. Create Sample Churches
    console.log('🏛️ Creating sample churches...');
    await Promise.all([
      // Baclayon Church - Heritage Site
      db.collection('churches').doc('baclayon-church').set({
        id: 'baclayon-church',
        name: 'Our Lady of the Immaculate Conception Church (Baclayon)',
        diocese: 'tagbilaran',
        municipality: 'Baclayon',
        parish: 'baclayon-church',
        foundingYear: 1596,
        completionYear: 1727,
        architect: 'Jesuit Missionaries',
        architecturalStyle: 'Baroque Colonial',
        classification: 'National Cultural Treasure (NCT)',
        heritageClassification: 'heritage',

        // Basic Information
        description: 'One of the oldest stone churches in the Philippines, built by Jesuit missionaries in the 16th century. Features impressive baroque colonial architecture with coral stone construction.',
        historicalBackground: 'Founded by Spanish Jesuit missionaries in 1596, this church stands as one of the oldest stone churches in the Philippines. The current structure was completed in 1727 after multiple reconstructions.',
        culturalSignificance: 'Declared a National Cultural Treasure by the National Museum of the Philippines. Represents the Spanish colonial religious architecture in the Philippines.',

        // Location
        address: 'Poblacion, Baclayon, Bohol',
        coordinates: {
          latitude: 9.6223,
          longitude: 123.9045
        },

        // Church Details
        capacity: 400,
        currentPriest: 'Rev. Fr. Pedro Gonzales',

        // Mass Schedules
        massSchedules: {
          weekdays: ['6:00 AM', '5:30 PM'],
          saturday: ['6:00 AM', '5:30 PM'],
          sunday: ['6:00 AM', '8:00 AM', '10:00 AM', '5:30 PM'],
          specialMasses: ['First Friday: 6:00 PM'],
          languages: ['Cebuano', 'Tagalog']
        },

        // Contact Information
        contactInfo: {
          phoneNumber: '+63 38 412 3456',
          email: 'baclayon@tagbilaran.ph',
          facebookPage: 'Baclayon Church Official',
          website: 'https://baclayonchurch.ph'
        },

        // Status
        status: 'approved',
        verificationStatus: 'heritage_verified',
        isPublic: true,

        // Heritage Information
        heritageValidation: {
          validatedBy: 'museum-researcher',
          validatedAt: admin.firestore.FieldValue.serverTimestamp(),
          validatorName: 'Dr. Heritage Researcher',
          heritageNotes: 'Verified as authentic 16th-century religious architecture. Coral stone construction shows excellent preservation.',
          declaration: 'National Cultural Treasure (NCT) - NHCP Resolution No. 2010-001'
        },

        // Metadata
        createdBy: 'baclayon-secretary',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastHeritageUpdate: admin.firestore.FieldValue.serverTimestamp()
      }),

      // St. Joseph Cathedral
      db.collection('churches').doc('tagbilaran-cathedral').set({
        id: 'tagbilaran-cathedral',
        name: 'St. Joseph the Worker Cathedral',
        diocese: 'tagbilaran',
        municipality: 'Tagbilaran City',
        parish: 'tagbilaran-cathedral',
        foundingYear: 1767,
        completionYear: 1872,
        architecturalStyle: 'Neo-Classical',
        classification: 'Cathedral',
        heritageClassification: 'non-heritage',

        // Basic Information
        description: 'The cathedral church of the Diocese of Tagbilaran, dedicated to St. Joseph the Worker. Features neo-classical architecture with modern renovations.',
        historicalBackground: 'Originally built in 1767, the current structure was completed in 1872. It became a cathedral when the Diocese of Tagbilaran was established in 1968.',

        // Location
        address: 'CPG North Avenue, Tagbilaran City, Bohol',
        coordinates: {
          latitude: 9.6496,
          longitude: 123.8569
        },

        // Church Details
        capacity: 800,
        currentPriest: 'Rev. Fr. Juan dela Cruz',

        // Mass Schedules
        massSchedules: {
          weekdays: ['5:30 AM', '6:00 PM'],
          saturday: ['5:30 AM', '6:00 PM'],
          sunday: ['5:30 AM', '7:00 AM', '8:30 AM', '10:00 AM', '6:00 PM'],
          specialMasses: ['First Friday: 7:00 PM', 'Novena: Every Wednesday 6:00 PM'],
          languages: ['Cebuano', 'Tagalog', 'English']
        },

        // Contact Information
        contactInfo: {
          phoneNumber: '+63 38 411 2345',
          email: 'cathedral@tagbilaran.ph',
          facebookPage: 'St Joseph Cathedral Tagbilaran',
          website: 'https://tagbilarandiocese.org'
        },

        // Status
        status: 'approved',
        verificationStatus: 'approved',
        isPublic: true,

        // Metadata
        createdBy: 'tagbilaran-admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }),

      // Talibon Cathedral
      db.collection('churches').doc('talibon-cathedral').set({
        id: 'talibon-cathedral',
        name: 'Our Lady of Mount Carmel Cathedral',
        diocese: 'talibon',
        municipality: 'Talibon',
        parish: 'talibon-cathedral',
        foundingYear: 1852,
        completionYear: 1885,
        architecturalStyle: 'Spanish Colonial',
        classification: 'Cathedral',
        heritageClassification: 'non-heritage',

        // Basic Information
        description: 'The cathedral of the Diocese of Talibon, dedicated to Our Lady of Mount Carmel. A beautiful example of Spanish colonial church architecture in northern Bohol.',
        historicalBackground: 'Founded in 1852 and completed in 1885. It became the cathedral when the Diocese of Talibon was created in 1986.',

        // Location
        address: 'Poblacion, Talibon, Bohol',
        coordinates: {
          latitude: 10.1167,
          longitude: 124.2833
        },

        // Church Details
        capacity: 600,
        currentPriest: 'Rev. Fr. Miguel Rodriguez',

        // Mass Schedules
        massSchedules: {
          weekdays: ['5:30 AM', '5:00 PM'],
          saturday: ['5:30 AM', '5:00 PM'],
          sunday: ['6:00 AM', '8:00 AM', '10:00 AM', '5:00 PM'],
          specialMasses: ['Novena to Our Lady: Every Wednesday 5:00 PM'],
          languages: ['Cebuano', 'Tagalog']
        },

        // Contact Information
        contactInfo: {
          phoneNumber: '+63 38 515 1234',
          email: 'cathedral@talibon.ph',
          facebookPage: 'Talibon Cathedral',
          website: 'https://talibondiocese.org'
        },

        // Status
        status: 'approved',
        verificationStatus: 'approved',
        isPublic: true,

        // Metadata
        createdBy: 'talibon-secretary',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    ]);

    // 7. Create Sample Announcements
    console.log('📢 Creating sample announcements...');
    await Promise.all([
      db.collection('announcements').doc('diocesan-congress-2024').set({
        id: 'diocesan-congress-2024',
        title: 'Diocese of Tagbilaran Pastoral Congress 2024',
        description: 'Join us for the annual Diocesan Pastoral Congress focusing on "Evangelization in the Digital Age". All parish leaders, lay ministers, and faithful are invited.',
        content: 'The Diocese of Tagbilaran invites all the faithful to participate in the 2024 Diocesan Pastoral Congress to be held at the Holy Name University Convention Center. This year\'s theme focuses on how we can effectively evangelize in our modern digital world.',

        // Event Details
        eventDate: new Date('2024-11-15T08:00:00Z'),
        eventTime: '8:00 AM - 5:00 PM',
        venue: 'Holy Name University Convention Center, Tagbilaran City',

        // Categorization
        type: 'diocesan',
        priority: 'high',
        scope: 'diocesan',
        diocese: 'tagbilaran',

        // Target Audience
        targetAudience: ['clergy', 'lay_ministers', 'parish_leaders', 'faithful'],

        // Contact Information
        contactPerson: 'Fr. Juan dela Cruz',
        contactEmail: 'chancery@tagbilaran.ph',
        contactPhone: '+63 38 411 2345',

        // Status
        status: 'published',
        isPublic: true,
        featured: true,

        // Metadata
        publishedBy: 'tagbilaran-admin',
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date('2024-11-16T00:00:00Z')
      }),

      db.collection('announcements').doc('baclayon-fiesta-2024').set({
        id: 'baclayon-fiesta-2024',
        title: 'Baclayon Fiesta 2024 - Feast of the Immaculate Conception',
        description: 'Celebrate the annual parish fiesta in honor of Our Lady of the Immaculate Conception. Join us for nine days of novena, cultural presentations, and the grand fiesta celebration.',
        content: 'The Parish of Our Lady of the Immaculate Conception, Baclayon cordially invites everyone to join our annual parish fiesta celebration. The novena masses will begin on November 30, 2024, culminating in the grand celebration on December 8, 2024.',

        // Event Details
        eventDate: new Date('2024-12-08T06:00:00Z'),
        eventTime: '6:00 AM - 10:00 PM',
        venue: 'Our Lady of the Immaculate Conception Church, Baclayon',

        // Categorization
        type: 'parish',
        priority: 'medium',
        scope: 'parish',
        diocese: 'tagbilaran',
        parishId: 'baclayon-church',

        // Target Audience
        targetAudience: ['parishioners', 'devotees', 'tourists'],

        // Contact Information
        contactPerson: 'Mrs. Elena Fernandez',
        contactEmail: 'secretary@baclayon.ph',
        contactPhone: '+63 917 123 4567',

        // Status
        status: 'published',
        isPublic: true,
        featured: false,

        // Metadata
        publishedBy: 'baclayon-secretary',
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date('2024-12-09T00:00:00Z')
      })
    ]);

    // 8. Create Sample Feedback
    console.log('💬 Creating sample feedback...');
    await Promise.all([
      db.collection('feedback').doc('baclayon-feedback-1').set({
        id: 'baclayon-feedback-1',
        churchId: 'baclayon-church',
        userId: 'anonymous-user-1',
        userName: 'Maria Clara',
        userEmail: 'maria.clara@email.com',

        // Feedback Content
        title: 'Amazing Historical Church',
        content: 'Visited Baclayon Church during our heritage tour. The architecture is breathtaking and the historical significance is incredible. The church museum has fascinating artifacts. Highly recommended for history enthusiasts!',
        rating: 5,

        // Visit Information
        visitDate: new Date('2024-09-10T00:00:00Z'),
        visitType: 'tourist',
        recommendToOthers: true,

        // Categories
        categories: ['architecture', 'history', 'museum'],
        tags: ['heritage', 'baroque', 'jesuit', 'must-visit'],

        // Status
        status: 'approved',
        isPublic: true,

        // Moderation
        moderatedBy: 'baclayon-secretary',
        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),

        // Metadata
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }),

      db.collection('feedback').doc('cathedral-feedback-1').set({
        id: 'cathedral-feedback-1',
        churchId: 'tagbilaran-cathedral',
        userId: 'anonymous-user-2',
        userName: 'John Santos',
        userEmail: 'john.santos@email.com',

        // Feedback Content
        title: 'Beautiful Cathedral',
        content: 'Attended Sunday mass at St. Joseph Cathedral. The architecture is beautiful and the mass was well-conducted. Great acoustics and spacious interior. The parish community is very welcoming.',
        rating: 4,

        // Visit Information
        visitDate: new Date('2024-09-15T00:00:00Z'),
        visitType: 'worship',
        recommendToOthers: true,

        // Categories
        categories: ['worship', 'community', 'architecture'],
        tags: ['cathedral', 'mass', 'welcoming', 'beautiful'],

        // Status
        status: 'approved',
        isPublic: true,

        // Moderation
        moderatedBy: 'tagbilaran-admin',
        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),

        // Metadata
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    ]);

    console.log('✅ MVP seed data created successfully!');
    console.log('\n📋 Summary of created data:');
    console.log('- 2 Dioceses: Tagbilaran, Talibon');
    console.log('- 2 Chancery Office users (admin access)');
    console.log('- 1 Museum Researcher user');
    console.log('- 2 Parish Secretary users');
    console.log('- 3 Parishes');
    console.log('- 3 Sample Churches (1 heritage, 2 regular)');
    console.log('- 2 Sample Announcements');
    console.log('- 2 Sample Feedback entries');

    console.log('\n🔑 Test Login Credentials:');
    console.log('Tagbilaran Chancery: chancery@tagbilaran.ph');
    console.log('Talibon Chancery: chancery@talibon.ph');
    console.log('Museum Researcher: researcher@museum.gov.ph');
    console.log('Baclayon Secretary: secretary@baclayon.ph');
    console.log('Talibon Secretary: secretary@talibon.ph');
    console.log('\nNote: You will need to create these users in Firebase Auth with temporary passwords.');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }

  console.log('\n🚀 VISITA MVP is ready for testing!');
  process.exit(0);
}

// Run the seeding
seedData();