// Quick script to create test user profile in Firestore
// This helps resolve the "profile not accessible" error
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../contexts/AuthContext';

export const createTestUser = async (uid: string): Promise<void> => {
  try {
    const testUserProfile: Omit<UserProfile, 'uid'> = {
      email: 'test@chancery.tagbilaran.gov.ph',
      role: 'chancery_office',
      name: 'Test Chancery Administrator',
      diocese: 'tagbilaran',
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    await setDoc(doc(db, 'users', uid), {
      ...testUserProfile,
      createdAt: testUserProfile.createdAt,
      lastLoginAt: testUserProfile.lastLoginAt
    });

    console.log('✅ Test user profile created successfully');
    console.log('Profile:', testUserProfile);
  } catch (error) {
    console.error('❌ Error creating test user profile:', error);
    throw error;
  }
};

export const createTestUsers = async (): Promise<void> => {
  try {
    // Chancery Office - Tagbilaran
    await setDoc(doc(db, 'users', 'test-chancery-tagbilaran'), {
      email: 'chancery@tagbilaran.gov.ph',
      role: 'chancery_office',
      name: 'Tagbilaran Chancery Office',
      diocese: 'tagbilaran',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    // Chancery Office - Talibon
    await setDoc(doc(db, 'users', 'test-chancery-talibon'), {
      email: 'chancery@talibon.gov.ph',
      role: 'chancery_office',
      name: 'Talibon Chancery Office',
      diocese: 'talibon',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    // Museum Researcher
    await setDoc(doc(db, 'users', 'test-museum-researcher'), {
      email: 'researcher@boholheritage.gov.ph',
      role: 'museum_researcher',
      name: 'Bohol Heritage Researcher',
      diocese: 'tagbilaran', // Default diocese for researcher
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    // Parish Secretary - Tagbilaran
    await setDoc(doc(db, 'users', 'test-parish-tagbilaran'), {
      email: 'secretary@santonino.tagbilaran.ph',
      role: 'parish',
      name: 'Santo Niño Parish Secretary',
      diocese: 'tagbilaran',
      parish: 'santo-nino-tagbilaran',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    console.log('✅ All test user profiles created successfully');
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  }
};

// Helper function to create sample churches data
export const createSampleChurches = async (): Promise<void> => {
  try {
    const churches = [
      {
        id: 'santo-nino-tagbilaran',
        name: 'Santo Niño Church',
        diocese: 'tagbilaran',
        parish: 'santo-nino-tagbilaran',
        address: 'Tagbilaran City, Bohol',
        status: 'active',
        createdAt: new Date(),
        lastUpdated: new Date()
      },
      {
        id: 'sacred-heart-talibon',
        name: 'Sacred Heart Parish',
        diocese: 'talibon', 
        parish: 'sacred-heart-talibon',
        address: 'Talibon, Bohol',
        status: 'active',
        createdAt: new Date(),
        lastUpdated: new Date()
      }
    ];

    for (const church of churches) {
      await setDoc(doc(db, 'churches', church.id), church);
    }

    console.log('✅ Sample churches created successfully');
  } catch (error) {
    console.error('❌ Error creating sample churches:', error);
    throw error;
  }
};

// Run this script to set up test data
if (typeof window !== 'undefined') {
  console.log('🚀 Test user creation script loaded');
  console.log('Call createTestUsers() or createSampleChurches() to set up test data');
}