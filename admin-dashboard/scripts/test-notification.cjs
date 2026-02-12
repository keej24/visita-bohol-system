/**
 * Test script to create sample notifications for testing
 * Run this to verify notifications are working
 */

const admin = require('firebase-admin');
const path = require('path');

// Load service account
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'visitaproject-5cd9f'
});

const db = admin.firestore();

async function createTestNotifications() {
  try {
    // 1. Create church_submitted notification for Chancery
    const submittedNotification = {
      type: 'church_submitted',
      priority: 'high',
      title: 'New Church Submission: Test Parish Church',
      message: 'Parish has submitted "Test Parish Church" for review. Please review the church profile and approve or request revisions.',
      recipients: {
        roles: ['chancery_office'],
        dioceses: ['tagbilaran']
      },
      relatedData: {
        churchId: 'test-church-id',
        churchName: 'Test Parish Church',
        fromStatus: 'draft',
        toStatus: 'pending',
        actionBy: {
          uid: 'test-user',
          name: 'Test Parish Secretary',
          role: 'parish'
        }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      readBy: [],
      actionUrl: '/chancery/dashboard',
      metadata: { diocese: 'tagbilaran' }
    };

    const doc1 = await db.collection('notifications').add(submittedNotification);
    console.log('✅ church_submitted notification created:', doc1.id);

    // 2. Create church_approved notification for Parish Secretary
    const approvedNotification = {
      type: 'church_approved',
      priority: 'medium',
      title: 'Church Published: Our Lady of Lourdes Parish',
      message: 'Congratulations! "Our Lady of Lourdes Parish" has been approved and is now live for public viewing in the VISITA app.',
      recipients: {
        roles: ['parish'],
        dioceses: ['tagbilaran']
      },
      relatedData: {
        churchId: 'test-church-id-2',
        churchName: 'Our Lady of Lourdes Parish',
        fromStatus: 'pending',
        toStatus: 'approved'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
      readBy: [],
      actionUrl: '/parish/dashboard'
    };

    const doc2 = await db.collection('notifications').add(approvedNotification);
    console.log('✅ church_approved notification created:', doc2.id);

    console.log('');
    console.log('--- All notifications in database ---');
    const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(10).get();
    console.log('Total:', snap.size, 'notifications');
    snap.forEach(doc => {
      const d = doc.data();
      console.log('-', d.type, '| Roles:', d.recipients?.roles?.join(','), '| Diocese:', d.recipients?.dioceses?.join(','));
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestNotifications();
