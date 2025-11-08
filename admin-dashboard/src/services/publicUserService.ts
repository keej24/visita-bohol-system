import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  updateDoc,
  QueryConstraint,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  PublicUser,
  PublicUserWithStats,
  PublicUserFilter,
  UpdatePublicUser,
  BlockPublicUser,
  UnblockPublicUser,
  validatePublicUserFilter,
} from '../lib/validations/publicUser';

// Collection references
const USERS_COLLECTION = 'users';
const CHURCH_VISITED_COLLECTION = 'church_visited';
const FEEDBACK_COLLECTION = 'feedback';

/**
 * Convert Firestore timestamp to ISO string
 */
const timestampToString = (timestamp: any): string | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
};

/**
 * Convert Firestore document to PublicUser
 */
const firestoreDocToPublicUser = (doc: DocumentSnapshot): PublicUser | null => {
  if (!doc.exists()) return null;

  const data = doc.data();

  return {
    id: doc.id,
    displayName: data.displayName || data.name || 'Unknown User',
    email: data.email || '',
    profileImageUrl: data.profileImageUrl || null,
    phoneNumber: data.phoneNumber || null,
    location: data.location || null,
    bio: data.bio || null,
    nationality: data.nationality || null,
    parish: data.parish || 'Not specified',
    affiliation: data.affiliation || 'Public User',
    accountType: data.accountType || 'public',
    visitedChurches: data.visitedChurches || [],
    favoriteChurches: data.favoriteChurches || [],
    forVisitChurches: data.forVisitChurches || [],
    journalEntries: data.journalEntries || [],
    preferences: data.preferences || {
      enableNotifications: true,
      enableFeastDayReminders: false,
      enableLocationReminders: false,
      shareProgressPublically: false,
      preferredLanguage: 'en',
      darkMode: false,
    },
    isActive: data.isActive !== undefined ? data.isActive : true,
    isBlocked: data.isBlocked || false,
    blockReason: data.blockReason || null,
    blockedAt: timestampToString(data.blockedAt),
    blockedBy: data.blockedBy || null,
    createdAt: timestampToString(data.createdAt) || new Date().toISOString(),
    lastLoginAt: timestampToString(data.lastLoginAt),
    lastUpdatedAt: timestampToString(data.lastUpdatedAt),
  };
};

/**
 * Get user statistics from related collections
 */
const getUserStats = async (userId: string, churchId?: string) => {
  try {
    // Get visit count
    const visitsQuery = churchId
      ? query(
          collection(db, CHURCH_VISITED_COLLECTION),
          where('pub_user_id', '==', userId),
          where('church_id', '==', churchId)
        )
      : query(
          collection(db, CHURCH_VISITED_COLLECTION),
          where('pub_user_id', '==', userId)
        );
    const visitsSnapshot = await getDocs(visitsQuery);
    const totalVisits = visitsSnapshot.size;

    // Get last visit date
    const visitsData = visitsSnapshot.docs.map(doc => doc.data());
    const lastVisit = visitsData.length > 0
      ? visitsData.reduce((latest, visit) => {
          const visitDate = timestampToString(visit.visit_date);
          if (!latest || (visitDate && visitDate > latest)) {
            return visitDate;
          }
          return latest;
        }, null as string | null)
      : null;

    // Get feedback/reviews count and average rating
    const feedbackQuery = churchId
      ? query(
          collection(db, FEEDBACK_COLLECTION),
          where('pub_user_id', '==', userId),
          where('church_id', '==', churchId)
        )
      : query(
          collection(db, FEEDBACK_COLLECTION),
          where('pub_user_id', '==', userId)
        );
    const feedbackSnapshot = await getDocs(feedbackQuery);
    const totalReviews = feedbackSnapshot.size;

    const feedbackData = feedbackSnapshot.docs.map(doc => doc.data());
    const averageRating = totalReviews > 0
      ? feedbackData.reduce((sum, fb) => sum + (fb.rating || 0), 0) / totalReviews
      : 0;

    // Get last review date
    const lastReview = feedbackData.length > 0
      ? feedbackData.reduce((latest, fb) => {
          const reviewDate = timestampToString(fb.createdAt);
          if (!latest || (reviewDate && reviewDate > latest)) {
            return reviewDate;
          }
          return latest;
        }, null as string | null)
      : null;

    return {
      totalVisits,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      lastVisitDate: lastVisit,
      lastReviewDate: lastReview,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalVisits: 0,
      totalReviews: 0,
      averageRating: 0,
      lastVisitDate: null,
      lastReviewDate: null,
    };
  }
};

/**
 * Fetch public users with filters and statistics
 */
export const getPublicUsers = async (
  filters: PublicUserFilter = {},
  churchId?: string
): Promise<{ users: PublicUserWithStats[]; hasMore: boolean; lastDoc: DocumentSnapshot | null }> => {
  try {
    // Validate filters
    const validatedFilters = validatePublicUserFilter(filters);

    // Build query constraints
    const constraints: QueryConstraint[] = [
      where('accountType', '==', 'public'),
    ];

    // Apply filters
    if (validatedFilters.isActive !== undefined) {
      constraints.push(where('isActive', '==', validatedFilters.isActive));
    }

    if (validatedFilters.isBlocked !== undefined) {
      constraints.push(where('isBlocked', '==', validatedFilters.isBlocked));
    }

    if (validatedFilters.nationality) {
      constraints.push(where('nationality', '==', validatedFilters.nationality));
    }

    // Apply sorting
    constraints.push(orderBy(validatedFilters.sortBy, validatedFilters.sortOrder));

    // Apply pagination
    constraints.push(firestoreLimit(validatedFilters.limit + 1)); // Fetch one extra to check hasMore

    // Execute query
    const usersQuery = query(collection(db, USERS_COLLECTION), ...constraints);
    const snapshot = await getDocs(usersQuery);

    // Check if there are more results
    const hasMore = snapshot.docs.length > validatedFilters.limit;
    const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

    // Convert documents to public users with stats
    const usersPromises = docs.map(async (doc) => {
      const user = firestoreDocToPublicUser(doc);
      if (!user) return null;

      // Get user statistics
      const stats = await getUserStats(user.id, churchId);

      const userWithStats: PublicUserWithStats = {
        ...user,
        stats: {
          totalVisits: stats.totalVisits,
          totalReviews: stats.totalReviews,
          averageRating: stats.averageRating,
          totalFavorites: user.favoriteChurches.length,
          totalPlanned: user.forVisitChurches.length,
          totalJournalEntries: user.journalEntries.length,
          lastVisitDate: stats.lastVisitDate,
          lastReviewDate: stats.lastReviewDate,
        },
      };

      return userWithStats;
    });

    const usersWithStats = (await Promise.all(usersPromises)).filter(
      (user): user is PublicUserWithStats => user !== null
    );

    // Apply client-side filters (for fields that can't be queried directly)
    let filteredUsers = usersWithStats;

    // Filter by search term (displayName or email)
    if (validatedFilters.search) {
      const searchLower = validatedFilters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.displayName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    // Filter by church visited
    if (validatedFilters.hasVisitedChurch) {
      filteredUsers = filteredUsers.filter((user) =>
        user.visitedChurches.includes(validatedFilters.hasVisitedChurch!)
      );
    }

    // Filter by minimum visits
    if (validatedFilters.minVisits !== undefined) {
      filteredUsers = filteredUsers.filter(
        (user) => user.stats.totalVisits >= validatedFilters.minVisits!
      );
    }

    // Filter by minimum reviews
    if (validatedFilters.minReviews !== undefined) {
      filteredUsers = filteredUsers.filter(
        (user) => user.stats.totalReviews >= validatedFilters.minReviews!
      );
    }

    return {
      users: filteredUsers,
      hasMore,
      lastDoc,
    };
  } catch (error) {
    console.error('Error fetching public users:', error);
    throw new Error('Failed to fetch public users');
  }
};

/**
 * Get a single public user by ID with statistics
 */
export const getPublicUserById = async (
  userId: string,
  churchId?: string
): Promise<PublicUserWithStats | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const user = firestoreDocToPublicUser(userDoc);

    if (!user) return null;

    // Get user statistics
    const stats = await getUserStats(user.id, churchId);

    return {
      ...user,
      stats: {
        totalVisits: stats.totalVisits,
        totalReviews: stats.totalReviews,
        averageRating: stats.averageRating,
        totalFavorites: user.favoriteChurches.length,
        totalPlanned: user.forVisitChurches.length,
        totalJournalEntries: user.journalEntries.length,
        lastVisitDate: stats.lastVisitDate,
        lastReviewDate: stats.lastReviewDate,
      },
    };
  } catch (error) {
    console.error('Error fetching public user:', error);
    throw new Error('Failed to fetch public user');
  }
};

/**
 * Update public user (admin only)
 */
export const updatePublicUser = async (
  userId: string,
  updates: UpdatePublicUser
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    const updateData: any = {
      ...updates,
      lastUpdatedAt: Timestamp.now(),
    };

    if (updates.blockedAt) {
      updateData.blockedAt = Timestamp.fromDate(new Date(updates.blockedAt));
    }

    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error('Error updating public user:', error);
    throw new Error('Failed to update public user');
  }
};

/**
 * Block a public user
 */
export const blockPublicUser = async (blockData: BlockPublicUser): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, blockData.userId);

    await updateDoc(userRef, {
      isBlocked: true,
      blockReason: blockData.blockReason,
      blockedAt: Timestamp.now(),
      blockedBy: blockData.blockedBy,
      lastUpdatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error blocking public user:', error);
    throw new Error('Failed to block public user');
  }
};

/**
 * Unblock a public user
 */
export const unblockPublicUser = async (unblockData: UnblockPublicUser): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, unblockData.userId);

    await updateDoc(userRef, {
      isBlocked: false,
      blockReason: null,
      blockedAt: null,
      blockedBy: null,
      lastUpdatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error unblocking public user:', error);
    throw new Error('Failed to unblock public user');
  }
};

/**
 * Get public user activity summary
 */
export interface UserActivitySummary {
  userId: string;
  userName: string;
  totalVisits: number;
  totalReviews: number;
  averageRating: number;
  visitedChurches: string[];
  lastActivity: string | null;
}

export const getPublicUserActivity = async (userId: string): Promise<UserActivitySummary | null> => {
  try {
    const user = await getPublicUserById(userId);
    if (!user) return null;

    return {
      userId: user.id,
      userName: user.displayName,
      totalVisits: user.stats.totalVisits,
      totalReviews: user.stats.totalReviews,
      averageRating: user.stats.averageRating,
      visitedChurches: user.visitedChurches,
      lastActivity: user.stats.lastVisitDate || user.stats.lastReviewDate || user.lastLoginAt,
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw new Error('Failed to fetch user activity');
  }
};

/**
 * Get summary statistics for all public users
 */
export interface PublicUserSummaryStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalVisits: number;
  totalReviews: number;
  averageRating: number;
}

export const getPublicUserSummaryStats = async (churchId?: string): Promise<PublicUserSummaryStats> => {
  try {
    // Get all public users
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('accountType', '==', 'public')
    );
    const usersSnapshot = await getDocs(usersQuery);

    const totalUsers = usersSnapshot.size;
    let activeUsers = 0;
    let blockedUsers = 0;

    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isActive && !data.isBlocked) activeUsers++;
      if (data.isBlocked) blockedUsers++;
    });

    // Get visit stats
    const visitsQuery = churchId
      ? query(collection(db, CHURCH_VISITED_COLLECTION), where('church_id', '==', churchId))
      : collection(db, CHURCH_VISITED_COLLECTION);
    const visitsSnapshot = await getDocs(visitsQuery);
    const totalVisits = visitsSnapshot.size;

    // Get feedback stats
    const feedbackQuery = churchId
      ? query(collection(db, FEEDBACK_COLLECTION), where('church_id', '==', churchId))
      : collection(db, FEEDBACK_COLLECTION);
    const feedbackSnapshot = await getDocs(feedbackQuery);
    const totalReviews = feedbackSnapshot.size;

    const ratings = feedbackSnapshot.docs.map(doc => doc.data().rating || 0);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      totalVisits,
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  } catch (error) {
    console.error('Error fetching public user summary stats:', error);
    throw new Error('Failed to fetch summary statistics');
  }
};
