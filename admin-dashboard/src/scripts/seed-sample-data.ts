import { seedSampleChurches } from '@/lib/churches';

// Script to seed sample church data for testing
async function seedData() {
  try {
    console.log('Seeding sample churches for Tagbilaran...');
    await seedSampleChurches('tagbilaran');
    console.log('Sample churches seeded successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

export { seedData };