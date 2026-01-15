#!/usr/bin/env node

/**
 * Visitor Data Seeding Script for VISITA Capstone Defense
 * 
 * Generates realistic visitor logs in the church_visited collection
 * based on the study participant distribution:
 * - 12 public users across 6 parishes
 * - 4 parishes from Diocese of Tagbilaran (2 users each = 8 users)
 * - 2 parishes from Diocese of Talibon (2 users each = 4 users)
 * 
 * CONSTRAINT: Each user can only mark a church as visited ONCE.
 * Users may visit multiple different churches, but not the same church twice.
 * 
 * Usage:
 *   node scripts/seed-visitor-data.js [--extra-visits=2]
 *   
 * Options:
 *   --extra-visits   Number of additional churches each user visits (default: 0)
 *                    0 = only assigned parish (12 total visits)
 *                    1 = assigned + 1 other (up to 24 visits)
 *                    2 = assigned + 2 others (up to 36 visits)
 *   --clear          Clear existing visitor data before seeding
 */

const admin = require('firebase-admin');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const EXTRA_VISITS = parseInt(args['extra-visits']) || 0;
const CLEAR_FIRST = args.clear || false;

// Study participant distribution (12 public users)
const PARTICIPANT_DISTRIBUTION = {
  tagbilaran: {
    parishes: 4,
    usersPerParish: 2,
    totalUsers: 8
  },
  talibon: {
    parishes: 2,
    usersPerParish: 2,
    totalUsers: 4
  }
};

// Realistic time-of-day distributions (church visiting patterns)
const TIME_DISTRIBUTIONS = {
  morning: 0.45,    // 45% - Mass times, morning visitors
  afternoon: 0.35,  // 35% - Tourists, afternoon visitors
  evening: 0.20     // 20% - Evening mass, late visitors
};

// Day-of-week multipliers (more visitors on weekends)
const DAY_MULTIPLIERS = {
  0: 1.8,  // Sunday - highest (Mass day)
  1: 0.5,  // Monday
  2: 0.4,  // Tuesday
  3: 0.5,  // Wednesday
  4: 0.4,  // Thursday
  5: 0.6,  // Friday
  6: 1.3   // Saturday
};

// Sample parishes for each diocese (will be replaced with actual data if available)
const DEFAULT_PARISHES = {
  tagbilaran: [
    { id: 'church_baclayon', name: 'Baclayon Church', lat: 9.6187, lng: 123.9047, heritage: 'NCT' },
    { id: 'church_loboc', name: 'Loboc Church', lat: 9.6356, lng: 124.0297, heritage: 'ICP' },
    { id: 'church_dauis', name: 'Dauis Church', lat: 9.6203, lng: 123.8636, heritage: 'ICP' },
    { id: 'church_tagbilaran_cathedral', name: 'St. Joseph Cathedral', lat: 9.6500, lng: 123.8530, heritage: 'non_heritage' }
  ],
  talibon: [
    { id: 'church_talibon', name: 'Talibon Church', lat: 10.1167, lng: 124.2833, heritage: 'non_heritage' },
    { id: 'church_tubigon', name: 'Tubigon Church', lat: 9.9500, lng: 123.9500, heritage: 'non_heritage' }
  ]
};

// Generate public user ID
function generatePublicUserId(diocese, parishIndex, userIndex) {
  const dioceseCode = diocese === 'tagbilaran' ? 'TAG' : 'TAL';
  return `pub_user_${dioceseCode}_P${parishIndex + 1}_U${userIndex + 1}`;
}

// Generate realistic coordinates near a church (within 500m validation radius)
function generateNearbyLocation(churchLat, churchLng) {
  // Random offset within ~200m (realistic for validated visits)
  const latOffset = (Math.random() - 0.5) * 0.004;
  const lngOffset = (Math.random() - 0.5) * 0.004;
  return {
    latitude: churchLat + latOffset,
    longitude: churchLng + lngOffset
  };
}

// Get time of day based on weighted distribution
function getRandomTimeOfDay() {
  const rand = Math.random();
  if (rand < TIME_DISTRIBUTIONS.morning) return 'morning';
  if (rand < TIME_DISTRIBUTIONS.morning + TIME_DISTRIBUTIONS.afternoon) return 'afternoon';
  return 'evening';
}

// Generate a random date within the past 30 days
function getRandomPastDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  
  // Set realistic time based on time of day
  const timeOfDay = getRandomTimeOfDay();
  const hour = timeOfDay === 'morning' ? 6 + Math.floor(Math.random() * 5) :    // 6-10 AM
               timeOfDay === 'afternoon' ? 12 + Math.floor(Math.random() * 5) : // 12-4 PM
               17 + Math.floor(Math.random() * 3);                               // 5-7 PM
  
  date.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  
  return { date, timeOfDay };
}

class VisitorDataSeeder {
  constructor() {
    this.db = null;
    this.churches = { tagbilaran: [], talibon: [] };
    this.publicUsers = [];
  }

  async initialize() {
    // Try to load service account
    const possiblePaths = [
      path.join(__dirname, '../admin-dashboard/firebase-service-account.json'),
      path.join(__dirname, '../firebase-service-account.json'),
      path.join(__dirname, 'firebase-service-account.json')
    ];

    let serviceAccountPath = null;
    for (const p of possiblePaths) {
      try {
        require.resolve(p);
        serviceAccountPath = p;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!serviceAccountPath) {
      throw new Error(
        'Firebase service account not found. Please ensure firebase-service-account.json exists.'
      );
    }

    const serviceAccount = require(serviceAccountPath);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    this.db = admin.firestore();
    console.log('✅ Connected to Firebase');
  }

  async clearVisitorData() {
    console.log('🗑️  Clearing existing visitor data...');
    const snapshot = await this.db.collection('church_visited').get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No existing visitor data to clear');
      return;
    }

    // Batch delete in chunks of 500
    const batchSize = 500;
    let deleted = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = this.db.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deleted += chunk.length;
    }
    
    console.log(`✅ Cleared ${deleted} visitor records`);
  }

  async fetchChurchesFromDatabase() {
    console.log('📍 Fetching churches from database...');
    
    for (const diocese of ['tagbilaran', 'talibon']) {
      const snapshot = await this.db.collection('churches')
        .where('diocese', '==', diocese)
        .where('status', '==', 'approved')
        .get();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const lat = data.coordinates?.latitude || data.latitude;
        const lng = data.coordinates?.longitude || data.longitude;
        
        if (lat && lng) {
          this.churches[diocese].push({
            id: doc.id,
            name: data.name || data.churchName,
            lat,
            lng,
            heritage: data.heritageClassification || 'non_heritage'
          });
        }
      });
    }

    // Fall back to defaults if no churches found
    if (this.churches.tagbilaran.length === 0) {
      console.log('⚠️  No Tagbilaran churches found, using defaults');
      this.churches.tagbilaran = DEFAULT_PARISHES.tagbilaran;
    }
    if (this.churches.talibon.length === 0) {
      console.log('⚠️  No Talibon churches found, using defaults');
      this.churches.talibon = DEFAULT_PARISHES.talibon;
    }

    console.log(`✅ Found ${this.churches.tagbilaran.length} Tagbilaran churches`);
    console.log(`✅ Found ${this.churches.talibon.length} Talibon churches`);
  }

  generatePublicUsers() {
    console.log('👥 Generating public user profiles...');
    
    for (const [diocese, config] of Object.entries(PARTICIPANT_DISTRIBUTION)) {
      const parishCount = Math.min(config.parishes, this.churches[diocese].length);
      
      for (let p = 0; p < parishCount; p++) {
        const church = this.churches[diocese][p];
        
        for (let u = 0; u < config.usersPerParish; u++) {
          this.publicUsers.push({
            id: generatePublicUserId(diocese, p, u),
            diocese,
            primaryChurch: church,
            // Users may visit other churches too
            visitableChurches: this.churches[diocese]
          });
        }
      }
    }

    console.log(`✅ Generated ${this.publicUsers.length} public user profiles`);
  }

  generateVisitorLogs() {
    console.log(`📊 Generating visitor logs...`);
    console.log(`   • Each user visits their assigned parish (12 visits)`);
    if (EXTRA_VISITS > 0) {
      console.log(`   • Plus ${EXTRA_VISITS} extra church(es) per user`);
    }
    
    const visits = [];
    
    for (const user of this.publicUsers) {
      const visitedChurchIds = new Set();
      
      // 1. Always visit assigned parish (primary church)
      const { date: primaryDate, timeOfDay: primaryTime } = getRandomPastDate();
      const primaryLocation = generateNearbyLocation(user.primaryChurch.lat, user.primaryChurch.lng);
      
      visits.push({
        church_id: user.primaryChurch.id,
        church_name: user.primaryChurch.name,
        diocese: user.diocese,
        pub_user_id: user.id,
        visit_date: admin.firestore.Timestamp.fromDate(primaryDate),
        time_of_day: primaryTime,
        visit_status: 'validated',
        validated_location: primaryLocation,
        device_type: Math.random() > 0.1 ? 'mobile' : 'tablet',
        created_at: admin.firestore.Timestamp.fromDate(primaryDate)
      });
      visitedChurchIds.add(user.primaryChurch.id);
      
      // 2. Optional: visit additional churches (but each church only once)
      if (EXTRA_VISITS > 0) {
        const otherChurches = user.visitableChurches.filter(c => c.id !== user.primaryChurch.id);
        const shuffled = otherChurches.sort(() => Math.random() - 0.5);
        const extraChurches = shuffled.slice(0, Math.min(EXTRA_VISITS, shuffled.length));
        
        for (const church of extraChurches) {
          if (visitedChurchIds.has(church.id)) continue;
          
          const { date, timeOfDay } = getRandomPastDate();
          const location = generateNearbyLocation(church.lat, church.lng);
          
          visits.push({
            church_id: church.id,
            church_name: church.name,
            diocese: user.diocese,
            pub_user_id: user.id,
            visit_date: admin.firestore.Timestamp.fromDate(date),
            time_of_day: timeOfDay,
            visit_status: 'validated',
            validated_location: location,
            device_type: Math.random() > 0.1 ? 'mobile' : 'tablet',
            created_at: admin.firestore.Timestamp.fromDate(date)
          });
          visitedChurchIds.add(church.id);
        }
      }
    }

    // Sort by date (newest first)
    visits.sort((a, b) => b.visit_date.toDate() - a.visit_date.toDate());
    
    console.log(`✅ Generated ${visits.length} visitor records`);
    return visits;
  }

  async seedVisitorData(visits) {
    console.log('💾 Writing visitor data to Firestore...');
    
    const BATCH_SIZE = 500;
    let written = 0;
    
    for (let i = 0; i < visits.length; i += BATCH_SIZE) {
      const batch = this.db.batch();
      const chunk = visits.slice(i, i + BATCH_SIZE);
      
      chunk.forEach(visit => {
        const docRef = this.db.collection('church_visited').doc();
        batch.set(docRef, visit);
      });
      
      await batch.commit();
      written += chunk.length;
      process.stdout.write(`\r   Progress: ${written}/${visits.length} records`);
    }
    
    console.log('\n✅ Visitor data written successfully');
  }

  printSummary(visits) {
    console.log('\n' + '═'.repeat(50));
    console.log('📈 VISITOR DATA SUMMARY');
    console.log('═'.repeat(50));
    
    // By diocese
    const byDiocese = visits.reduce((acc, v) => {
      acc[v.diocese] = (acc[v.diocese] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📍 Visits by Diocese:');
    Object.entries(byDiocese).forEach(([diocese, count]) => {
      console.log(`   • ${diocese.charAt(0).toUpperCase() + diocese.slice(1)}: ${count} visits`);
    });
    
    // By church
    const byChurch = visits.reduce((acc, v) => {
      acc[v.church_name] = (acc[v.church_name] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n⛪ Visits by Church:');
    Object.entries(byChurch)
      .sort(([,a], [,b]) => b - a)
      .forEach(([name, count]) => {
        console.log(`   • ${name}: ${count} visits`);
      });
    
    // By time of day
    const byTime = visits.reduce((acc, v) => {
      acc[v.time_of_day] = (acc[v.time_of_day] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n🕐 Visits by Time of Day:');
    Object.entries(byTime).forEach(([time, count]) => {
      const pct = ((count / visits.length) * 100).toFixed(1);
      console.log(`   • ${time.charAt(0).toUpperCase() + time.slice(1)}: ${count} (${pct}%)`);
    });
    
    // Unique users
    const uniqueUsers = new Set(visits.map(v => v.pub_user_id)).size;
    console.log('\n👥 User Statistics:');
    console.log(`   • Unique visitors: ${uniqueUsers}`);
    console.log(`   • Total visits: ${visits.length}`);
    console.log(`   • Avg visits/user: ${(visits.length / uniqueUsers).toFixed(1)}`);
    
    console.log('\n' + '═'.repeat(50));
  }
}

async function main() {
  console.log('🌱 VISITA Visitor Data Seeder');
  console.log('═'.repeat(50));
  console.log('Study Participant Distribution:');
  console.log('   • Tagbilaran: 4 parishes × 2 users = 8 public users');
  console.log('   • Talibon: 2 parishes × 2 users = 4 public users');
  console.log('   • Total: 12 public users');
  console.log('');
  console.log('Visit Constraint: One visit per user per church');
  console.log('');
  console.log('Configuration:');
  console.log(`   • Extra visits per user: ${EXTRA_VISITS}`);
  console.log(`   • Expected total visits: ${12 * (1 + EXTRA_VISITS)}`);
  console.log(`   • Clear existing data: ${CLEAR_FIRST}`);
  console.log('═'.repeat(50));
  console.log('');
  
  try {
    const seeder = new VisitorDataSeeder();
    await seeder.initialize();
    
    if (CLEAR_FIRST) {
      await seeder.clearVisitorData();
    }
    
    await seeder.fetchChurchesFromDatabase();
    seeder.generatePublicUsers();
    const visits = seeder.generateVisitorLogs();
    await seeder.seedVisitorData(visits);
    seeder.printSummary(visits);
    
    console.log('\n🎉 Seeding complete!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Check admin dashboard Reports page for visitor trends');
    console.log('   2. Parish dashboards will show engagement metrics');
    console.log('   3. Generate PDF reports to verify data visualization');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { VisitorDataSeeder };
