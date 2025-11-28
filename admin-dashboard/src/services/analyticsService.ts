// Analytics service for fetching real visitor and feedback data
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types for analytics data
export interface VisitorLog {
  id: string;
  churchId: string;
  userId?: string;
  visitDate: Date;
  source: 'mobile_app' | 'qr_code' | 'website' | 'direct';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

export interface FeedbackData {
  id: string;
  churchId: string;
  userId: string;
  rating: number;
  subject: string;
  message: string;
  status: 'published' | 'hidden' | 'pending';
  createdAt: Date;
  images?: string[];
}

export interface AnalyticsData {
  visitorLogs: VisitorLog[];
  feedback: FeedbackData[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export class AnalyticsService {
  // Fetch visitor logs for a specific church from church_visited collection
  static async getVisitorLogs(
    churchId: string,
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<VisitorLog[]> {
    try {
      const visitorLogsRef = collection(db, 'church_visited');

      let q = query(
        visitorLogsRef,
        where('church_id', '==', churchId),
        where('visit_date', '>=', Timestamp.fromDate(startDate)),
        where('visit_date', '<=', Timestamp.fromDate(endDate)),
        orderBy('visit_date', 'desc')
      );

      if (limit) {
        q = query(q, firestoreLimit(limit));
      }

      const querySnapshot = await getDocs(q);

      // Only count validated in-person visits (user was within church vicinity)
      return querySnapshot.docs
        .filter(doc => doc.data().visit_status === 'validated')
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            churchId: data.church_id,
            userId: data.pub_user_id,
            visitDate: data.visit_date?.toDate() || new Date(),
            source: 'mobile_app', // All visits come from mobile app
            timeOfDay: data.time_of_day || 'afternoon',
            location: data.validated_location,
            deviceType: data.device_type || 'mobile'
          } as VisitorLog;
        });
    } catch (error) {
      console.error('Error fetching visitor logs:', error);
      // Return empty array if there's an error - don't use sample data
      return [];
    }
  }

  // Fetch feedback for a specific church
  static async getFeedback(
    churchId: string,
    startDate: Date,
    endDate: Date,
    status?: 'published' | 'hidden' | 'pending'
  ): Promise<FeedbackData[]> {
    try {
      const feedbackRef = collection(db, 'feedback');

      // Build base query with church_id and date range
      // Note: Firestore requires composite index for multiple where + orderBy
      let q = query(
        feedbackRef,
        where('church_id', '==', churchId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);

      console.log(`📊 Analytics: Fetched ${querySnapshot.docs.length} feedback docs for church ${churchId}`);

      // Filter by date range in memory since we can't use multiple range queries
      const allFeedback = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          const createdAt = data.date_submitted?.toDate?.() || data.createdAt?.toDate?.() || new Date();
          
          console.log(`📝 Feedback ${doc.id}:`, {
            rating: data.rating,
            subject: data.subject,
            status: data.status,
            createdAt: createdAt.toISOString(),
            dateSubmitted: data.date_submitted,
            hasCreatedAt: !!data.createdAt
          });
          
          return {
            id: doc.id,
            churchId: data.church_id || data.churchId,
            userId: data.pub_user_id || data.userId,
            rating: data.rating || 5,
            subject: data.subject || '',
            message: data.message || data.comment || '',
            status: data.status || 'published',
            createdAt: createdAt,
            images: data.images || []
          } as FeedbackData;
        });

      const filtered = allFeedback.filter(feedback => {
          // Filter by date range
          const inRange = feedback.createdAt >= startDate && feedback.createdAt <= endDate;
          if (!inRange) {
            console.log(`❌ Feedback ${feedback.id} filtered out - date ${feedback.createdAt.toISOString()} not in range ${startDate.toISOString()} to ${endDate.toISOString()}`);
          }
          return inRange;
        });

      console.log(`✅ Analytics: Returning ${filtered.length} feedback after date filter (range: ${startDate.toISOString()} to ${endDate.toISOString()})`);
      
      return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching feedback:', error);
      // Return empty array if there's an error - don't use sample data
      return [];
    }
  }

  // Generate comprehensive analytics for a church
  static async getChurchAnalytics(
    churchId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsData> {
    const [visitorLogs, feedback] = await Promise.all([
      this.getVisitorLogs(churchId, startDate, endDate),
      this.getFeedback(churchId, startDate, endDate, 'published')
    ]);

    return {
      visitorLogs,
      feedback,
      dateRange: { startDate, endDate }
    };
  }

  // Calculate visitor statistics
  static calculateVisitorStats(visitorLogs: VisitorLog[]) {
    const totalVisitors = visitorLogs.reduce((sum, log) => sum + 1, 0);
    const days = Math.max(1, Math.ceil((Date.now() - visitorLogs[visitorLogs.length - 1]?.visitDate.getTime() || Date.now()) / (1000 * 60 * 60 * 24)));
    const averageDaily = totalVisitors / days;

    // Find peak day
    const dailyVisits = visitorLogs.reduce((acc, log) => {
      const dateKey = log.visitDate.toISOString().split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const peakDay = Object.entries(dailyVisits)
      .sort(([,a], [,b]) => b - a)[0];

    // Time of day analysis
    const timeStats = visitorLogs.reduce((acc, log) => {
      acc[log.timeOfDay] = (acc[log.timeOfDay] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const peakTime = Object.entries(timeStats)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'afternoon';

    return {
      totalVisitors,
      averageDaily: Math.round(averageDaily * 10) / 10,
      peakDay: peakDay ? { date: peakDay[0], count: peakDay[1] } : null,
      peakTime,
      timeBreakdown: timeStats,
      sourceBreakdown: visitorLogs.reduce((acc, log) => {
        acc[log.source] = (acc[log.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Calculate feedback statistics
  static calculateFeedbackStats(feedback: FeedbackData[]) {
    const totalFeedback = feedback.length;
    const averageRating = totalFeedback > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0;

    const ratingDistribution = feedback.reduce((acc, f) => {
      acc[f.rating] = (acc[f.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalFeedback,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    };
  }

  // Sample data generators for when real data isn't available yet
  private static getSampleVisitorLogs(churchId: string, startDate: Date, endDate: Date): VisitorLog[] {
    const logs: VisitorLog[] = [];
    const sources: VisitorLog['source'][] = ['mobile_app', 'qr_code', 'website'];
    const times: VisitorLog['timeOfDay'][] = ['morning', 'afternoon', 'evening'];

    for (let i = 0; i < 30; i++) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000));
      if (date >= startDate) {
        logs.push({
          id: `sample-${i}`,
          churchId,
          visitDate: date,
          source: sources[Math.floor(Math.random() * sources.length)],
          timeOfDay: times[Math.floor(Math.random() * times.length)],
          deviceType: Math.random() > 0.7 ? 'desktop' : 'mobile'
        });
      }
    }

    return logs;
  }

  private static getSampleFeedback(churchId: string, startDate: Date, endDate: Date): FeedbackData[] {
    const subjects = [
      'Beautiful Sunday Mass',
      'Great Community Spirit',
      'Excellent Facilities',
      'Wonderful Experience',
      'Peaceful Atmosphere'
    ];

    const feedback: FeedbackData[] = [];

    for (let i = 0; i < 15; i++) {
      const date = new Date(endDate.getTime() - (i * 2 * 24 * 60 * 60 * 1000));
      if (date >= startDate) {
        feedback.push({
          id: `sample-feedback-${i}`,
          churchId,
          userId: `user-${i}`,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars mostly
          subject: subjects[Math.floor(Math.random() * subjects.length)],
          message: 'Sample feedback message about the church experience.',
          status: 'published',
          createdAt: date
        });
      }
    }

    return feedback;
  }
}