import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function debugAnnouncements() {
  console.log('🔍 Starting announcement debug...');
  
  try {
    // Get ALL announcements without any filters
    const q = query(collection(db, 'announcements'));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Total announcements in Firestore: ${snapshot.docs.length}`);
    
    if (snapshot.docs.length === 0) {
      console.warn('⚠️ No announcements found in Firestore at all!');
      console.log('💡 Possible issues:');
      console.log('  1. Announcements were not actually saved');
      console.log('  2. Wrong collection name');
      console.log('  3. Firestore rules blocking read access');
      return;
    }
    
    // Analyze each announcement
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📄 Announcement ${index + 1}:`);
      console.log('  ID:', doc.id);
      console.log('  Title:', data.title);
      console.log('  Diocese:', data.diocese);
      console.log('  Scope:', data.scope);
      console.log('  isArchived:', data.isArchived);
      console.log('  eventDate:', data.eventDate?.toDate?.() || data.eventDate);
      console.log('  endDate:', data.endDate?.toDate?.() || data.endDate);
      console.log('  createdAt:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('  Full data:', data);
    });
    
    // Check for common issues
    const tagbilaranAnnouncements = snapshot.docs.filter(doc => doc.data().diocese === 'tagbilaran');
    const talibonAnnouncements = snapshot.docs.filter(doc => doc.data().diocese === 'talibon');
    const noDiocese = snapshot.docs.filter(doc => !doc.data().diocese);
    const archived = snapshot.docs.filter(doc => doc.data().isArchived === true);
    const notArchived = snapshot.docs.filter(doc => doc.data().isArchived === false || doc.data().isArchived === undefined);
    
    console.log('\n📊 Summary:');
    console.log('  Tagbilaran:', tagbilaranAnnouncements.length);
    console.log('  Talibon:', talibonAnnouncements.length);
    console.log('  No diocese:', noDiocese.length);
    console.log('  Archived:', archived.length);
    console.log('  Not archived:', notArchived.length);
    
    // Check if any have wrong case
    const wrongCase = snapshot.docs.filter(doc => {
      const diocese = doc.data().diocese;
      return diocese && diocese !== 'tagbilaran' && diocese !== 'talibon';
    });
    
    if (wrongCase.length > 0) {
      console.warn('⚠️ Found announcements with incorrect diocese case:');
      wrongCase.forEach(doc => {
        console.log('  -', doc.id, ':', doc.data().diocese);
      });
    }
    
    // Check for missing required fields
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const missing = [];
      if (!data.diocese) missing.push('diocese');
      if (!data.title) missing.push('title');
      if (!data.eventDate) missing.push('eventDate');
      if (data.isArchived === undefined) missing.push('isArchived (defaults to false)');
      
      if (missing.length > 0) {
        console.warn(`⚠️ ${doc.id} is missing fields:`, missing);
      }
    });
    
    console.log('\n✅ Debug complete!');
    console.log('💡 If you see announcements above but they\'re not showing in the UI:');
    console.log('  1. Check if diocese matches exactly ("tagbilaran" not "Tagbilaran")');
    console.log('  2. Check if isArchived is false or undefined');
    console.log('  3. Check if eventDate is a valid Firestore Timestamp');
    
  } catch (error) {
    console.error('❌ Error debugging announcements:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

// Make it available globally for easy debugging
if (typeof window !== 'undefined') {
  (window as any).debugAnnouncements = debugAnnouncements;
  console.log('💡 Debug tool loaded! Run: debugAnnouncements()');
}
