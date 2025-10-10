// Sample parish data setup for testing Parish Review functionality
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4",
  authDomain: "visitaproject-5cd9f.firebaseapp.com",
  projectId: "visitaproject-5cd9f",
  storageBucket: "visitaproject-5cd9f.firebasestorage.app",
  messagingSenderId: "490423265288",
  appId: "1:490423265288:web:eee490e89f588ff9bfc9bd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tagbilaranParishes = [
  {
    name: "Holy Trinity Cathedral Parish",
    location: "Tagbilaran City",
    priest: "Rev. Fr. Miguel Santos",
    diocese: "tagbilaran",
    status: "active",
    lastReview: new Date('2024-11-01'),
    notes: "Main cathedral parish, excellent maintenance",
    contactEmail: "holytrinitycathedral@tagbilaran.diocese.ph",
    phoneNumber: "+63-38-411-2345",
    parishioners: 2500,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2024-11-01'),
  },
  {
    name: "St. Joseph the Worker Parish",
    location: "Dao, Tagbilaran City",
    priest: "Rev. Fr. Antonio Cruz",
    diocese: "tagbilaran",
    status: "review_required",
    lastReview: new Date('2024-09-15'),
    notes: "Needs infrastructure updates, pending renovation approval",
    contactEmail: "stjosephworker@tagbilaran.diocese.ph",
    phoneNumber: "+63-38-411-3456",
    parishioners: 1800,
    createdAt: new Date('2019-03-20'),
    updatedAt: new Date('2024-09-15'),
  },
  {
    name: "Our Lady of Light Parish",
    location: "Cortes",
    priest: "Rev. Fr. Roberto Villanueva",
    diocese: "tagbilaran",
    status: "active",
    lastReview: new Date('2024-10-20'),
    notes: "Active youth programs, good community involvement",
    contactEmail: "ourladyoflight@tagbilaran.diocese.ph",
    phoneNumber: "+63-38-412-1234",
    parishioners: 1200,
    createdAt: new Date('2018-05-10'),
    updatedAt: new Date('2024-10-20'),
  },
  {
    name: "San Isidro Labrador Parish",
    location: "Corella",
    priest: "Rev. Fr. Francis Reyes",
    diocese: "tagbilaran",
    status: "review_required",
    lastReview: new Date('2024-08-30'),
    notes: "Low attendance, needs outreach programs",
    contactEmail: "sanisidro@tagbilaran.diocese.ph",
    phoneNumber: "+63-38-412-2345",
    parishioners: 850,
    createdAt: new Date('2017-08-15'),
    updatedAt: new Date('2024-08-30'),
  },
  {
    name: "St. Augustine Parish",
    location: "Maribojoc",
    priest: "Rev. Fr. Emmanuel Torres",
    diocese: "tagbilaran",
    status: "active",
    lastReview: new Date('2024-11-10'),
    notes: "Heritage church, excellent preservation efforts",
    contactEmail: "staugustine@tagbilaran.diocese.ph",
    phoneNumber: "+63-38-413-1234",
    parishioners: 1600,
    createdAt: new Date('2016-12-01'),
    updatedAt: new Date('2024-11-10'),
  }
];

const talibonParishes = [
  {
    name: "St. Peter the Apostle Cathedral",
    location: "Talibon",
    priest: "Rev. Fr. Gabriel Mendoza",
    diocese: "talibon",
    status: "active",
    lastReview: new Date('2024-10-25'),
    notes: "Cathedral parish, strong leadership",
    contactEmail: "stpetercathedral@talibon.diocese.ph",
    phoneNumber: "+63-38-515-1234",
    parishioners: 2200,
    createdAt: new Date('2020-06-01'),
    updatedAt: new Date('2024-10-25'),
  },
  {
    name: "Our Lady of Fatima Parish",
    location: "Bien Unido",
    priest: "Rev. Fr. Jose Martinez",
    diocese: "talibon",
    status: "review_required",
    lastReview: new Date('2024-09-05'),
    notes: "Remote location, transportation challenges for priest",
    contactEmail: "ourladyfatima@talibon.diocese.ph",
    phoneNumber: "+63-38-516-2345",
    parishioners: 950,
    createdAt: new Date('2019-02-14'),
    updatedAt: new Date('2024-09-05'),
  },
  {
    name: "Holy Family Parish",
    location: "Trinidad",
    priest: "Rev. Fr. Pedro Gonzales",
    diocese: "talibon",
    status: "active",
    lastReview: new Date('2024-11-05'),
    notes: "Growing parish, new community programs",
    contactEmail: "holyfamily@talibon.diocese.ph",
    phoneNumber: "+63-38-517-3456",
    parishioners: 1300,
    createdAt: new Date('2018-09-20'),
    updatedAt: new Date('2024-11-05'),
  },
  {
    name: "St. Michael the Archangel Parish",
    location: "Ubay",
    priest: "Rev. Fr. Carlos Delgado",
    diocese: "talibon",
    status: "inactive",
    lastReview: new Date('2024-07-15'),
    notes: "Temporarily closed due to structural issues",
    contactEmail: "stmichael@talibon.diocese.ph",
    phoneNumber: "+63-38-518-4567",
    parishioners: 0,
    createdAt: new Date('2017-04-10'),
    updatedAt: new Date('2024-07-15'),
  }
];

async function setupParishData() {
  console.log('Setting up parish data...');

  try {
    // Add Tagbilaran parishes
    console.log('Adding Tagbilaran parishes...');
    for (const parish of tagbilaranParishes) {
      await addDoc(collection(db, 'parishes'), parish);
      console.log(`Added parish: ${parish.name}`);
    }

    // Add Talibon parishes
    console.log('Adding Talibon parishes...');
    for (const parish of talibonParishes) {
      await addDoc(collection(db, 'parishes'), parish);
      console.log(`Added parish: ${parish.name}`);
    }

    console.log('✅ Parish data setup completed successfully!');
    console.log(`Total parishes added: ${tagbilaranParishes.length + talibonParishes.length}`);
    
  } catch (error) {
    console.error('❌ Error setting up parish data:', error);
  }
}

// Run the setup
setupParishData().then(() => {
  console.log('Setup script completed.');
}).catch((error) => {
  console.error('Setup script failed:', error);
});