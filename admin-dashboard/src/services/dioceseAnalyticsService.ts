import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Diocese } from '@/contexts/AuthContext';

export interface ChurchSummaryData {
  id: string;
  name: string;
  municipality: string;
  foundingYear: number;
  classification: 'NCT' | 'ICP' | 'non_heritage';
  visitorCount: number;
  avgRating: number;
  feedbackCount: number;
  status: string;
  coordinates?: [number, number]; // [latitude, longitude]
  founders?: string[];
  architecturalStyle?: string;
  heritageStatus?: string;
  majorEvents?: string[];
  preservationHistory?: string[];
}

export interface DioceseAnalytics {
  totalChurches: number;
  heritageChurches: number;
  nonHeritageChurches: number;
  totalVisitors: number;
  totalFeedback: number;
  avgRating: number;
  churchesByMunicipality: Record<string, number>;
  churchesByClassification: {
    NCT: number;
    ICP: number;
    non_heritage: number;
  };
  visitorsByMonth: Array<{ month: string; visitors: number }>;
  topChurches: ChurchSummaryData[];
  recentActivity: {
    newChurches: number;
    pendingReviews: number;
    activeParishes: number;
  };
}

export interface EngagementMetrics {
  visitorTrends: Array<{ month: string; visitors: number }>;
  peakVisitingPeriods: Array<{
    period: string;
    visitors: number;
    peak: boolean;
  }>;
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  feedbackByMunicipality: Record<string, number>;
  topRatedChurches: Array<{
    name: string;
    rating: number;
    feedbackCount: number;
  }>;
}

export class DioceseAnalyticsService {
  /**
   * Get comprehensive diocese-wide analytics
   */
  static async getDioceseAnalytics(
    diocese: Diocese,
    startDate?: Date,
    endDate?: Date
  ): Promise<DioceseAnalytics> {
    try {
      console.log(`🔍 Fetching churches for diocese: ${diocese}`);

      // Fetch all churches in the diocese
      const churchesRef = collection(db, 'churches');
      const churchesQuery = query(
        churchesRef,
        where('diocese', '==', diocese)
      );
      const churchesSnapshot = await getDocs(churchesQuery);

      console.log(`📥 Firestore returned ${churchesSnapshot.size} documents`);

      // If no results with 'diocese' field, try alternate field names
      if (churchesSnapshot.empty) {
        console.log('⚠️ No churches found with "diocese" field, trying alternate queries...');

        // Try with basicInfo.diocese
        const altQuery = query(churchesRef, where('basicInfo.diocese', '==', diocese));
        const altSnapshot = await getDocs(altQuery);

        if (!altSnapshot.empty) {
          console.log(`✅ Found ${altSnapshot.size} churches using "basicInfo.diocese" field`);
          return this.processChurchData(altSnapshot, startDate, endDate);
        }
      }

      const churches: any[] = [];
      churchesSnapshot.forEach(doc => {
        churches.push({ id: doc.id, ...doc.data() });
      });

      console.log(`📊 Diocese Analytics: Found ${churches.length} churches in ${diocese} diocese`);
      if (churches.length > 0) {
        console.log('First church sample:', churches[0]);
      }

      // If no churches found, return safe defaults
      if (churches.length === 0) {
        console.warn('⚠️ No churches found in diocese:', diocese);
        return this.getEmptyAnalytics();
      }

      // Get visitor data for all churches
      const visitorLogsRef = collection(db, 'church_visited');
      let visitorQuery = query(
        visitorLogsRef,
        orderBy('visit_date', 'desc')
      );

      if (startDate) {
        visitorQuery = query(
          visitorLogsRef,
          where('visit_date', '>=', Timestamp.fromDate(startDate)),
          where('visit_date', '<=', Timestamp.fromDate(endDate || new Date())),
          orderBy('visit_date', 'desc')
        );
      }

      const visitorSnapshot = await getDocs(visitorQuery);
      const visitorLogs: any[] = [];
      visitorSnapshot.forEach(doc => {
        const data = doc.data();
        const church = churches.find(c => c.id === data.church_id);
        // Only count validated in-person visits (user was within church vicinity)
        if (church && data.visit_status === 'validated') {
          visitorLogs.push({ id: doc.id, ...data });
        }
      });

      // Get feedback for all churches
      const feedbackRef = collection(db, 'feedback');
      const feedbackQuery = query(
        feedbackRef,
        where('status', '==', 'published')
      );
      const feedbackSnapshot = await getDocs(feedbackQuery);
      const feedbackList: any[] = [];
      feedbackSnapshot.forEach(doc => {
        const data = doc.data();
        const church = churches.find(c => c.id === data.church_id);
        if (church) {
          feedbackList.push({ id: doc.id, ...data });
        }
      });

      // Calculate statistics
      const totalChurches = churches.length;
      const heritageChurches = churches.filter(c =>
        c.classification === 'NCT' || c.classification === 'ICP'
      ).length;
      const nonHeritageChurches = totalChurches - heritageChurches;

      const totalVisitors = visitorLogs.length;
      const totalFeedback = feedbackList.length;
      const avgRating = feedbackList.length > 0
        ? feedbackList.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackList.length
        : 0;

      // Churches by municipality
      const churchesByMunicipality = churches.reduce((acc, church) => {
        const municipality = church.locationDetails?.municipality || church.municipality || 'Unknown';
        acc[municipality] = (acc[municipality] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Churches by classification
      const churchesByClassification = churches.reduce((acc, church) => {
        const classification = church.classification || 'non_heritage';
        acc[classification] = (acc[classification] || 0) + 1;
        return acc;
      }, { NCT: 0, ICP: 0, non_heritage: 0 });

      // Visitors by month
      const visitorsByMonth = this.calculateMonthlyVisitors(visitorLogs);

      // All churches with visitor counts (sorted by visitor count)
      const churchVisitorCounts = churches.map(church => {
        const churchVisitors = visitorLogs.filter(v => v.church_id === church.id).length;
        const churchFeedback = feedbackList.filter(f => f.church_id === church.id);
        const churchAvgRating = churchFeedback.length > 0
          ? churchFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / churchFeedback.length
          : 0;

        // Extract founding year from various possible field locations
        const foundingYear =
          parseInt(church.historicalDetails?.foundingYear) ||
          parseInt(church.foundingYear) ||
          parseInt(church.historicalBackground?.foundingYear) ||
          1900;

        // Extract founders from various possible field locations
        const founders =
          church.historicalDetails?.founders ||
          church.historicalBackground?.founders ||
          church.founders ||
          [];

        // Extract architectural style
        const architecturalStyle =
          church.historicalDetails?.architecturalStyle ||
          church.architecturalStyle ||
          church.architecture?.style ||
          'Unknown';

        // Extract major events
        const majorEvents =
          church.historicalDetails?.majorEvents ||
          church.historicalBackground?.majorEvents ||
          church.majorEvents ||
          [];

        // Extract preservation history
        const preservationHistory =
          church.historicalDetails?.preservationHistory ||
          church.historicalBackground?.preservationHistory ||
          church.preservationHistory ||
          [];

        // Extract coordinates from various possible field locations
        let coordinates: [number, number] | undefined;
        const lat = church.locationDetails?.coordinates?.latitude ||
                    church.coordinates?.latitude ||
                    church.location?.coordinates?.latitude ||
                    church.latitude;
        const lng = church.locationDetails?.coordinates?.longitude ||
                    church.coordinates?.longitude ||
                    church.location?.coordinates?.longitude ||
                    church.longitude;

        if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
          coordinates = [lat, lng];
        }

        return {
          id: church.id,
          name: church.churchName || church.name || church.basicInfo?.churchName || 'Unknown Church',
          municipality: church.locationDetails?.municipality || church.municipality || church.location?.municipality || 'Unknown',
          foundingYear,
          classification: church.classification || church.heritageClassification || 'non_heritage',
          visitorCount: churchVisitors,
          avgRating: Math.round(churchAvgRating * 10) / 10,
          feedbackCount: churchFeedback.length,
          status: church.status || 'active',
          coordinates,
          founders,
          architecturalStyle,
          heritageStatus: church.classification === 'NCT' ? 'National Cultural Treasure' :
                          church.classification === 'ICP' ? 'Important Cultural Property' :
                          'Regular Church',
          majorEvents,
          preservationHistory
        };
      });

      // Sort ALL churches by visitor count (not just top 10)
      const topChurches = churchVisitorCounts
        .sort((a, b) => b.visitorCount - a.visitorCount);

      // Recent activity metrics
      const pendingChurches = churches.filter(c => c.status === 'pending_review').length;
      const newChurches = churches.filter(c => {
        const createdAt = c.createdAt?.toDate();
        if (!createdAt) return false;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdAt > thirtyDaysAgo;
      }).length;

      return {
        totalChurches,
        heritageChurches,
        nonHeritageChurches,
        totalVisitors,
        totalFeedback,
        avgRating: Math.round(avgRating * 10) / 10,
        churchesByMunicipality,
        churchesByClassification,
        visitorsByMonth,
        topChurches,
        recentActivity: {
          newChurches,
          pendingReviews: pendingChurches,
          activeParishes: churches.filter(c => c.status === 'approved').length
        }
      };
    } catch (error) {
      console.error('Error fetching diocese analytics:', error);
      // Return safe defaults instead of throwing
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get empty analytics structure (safe defaults)
   */
  private static getEmptyAnalytics(): DioceseAnalytics {
    return {
      totalChurches: 0,
      heritageChurches: 0,
      nonHeritageChurches: 0,
      totalVisitors: 0,
      totalFeedback: 0,
      avgRating: 0,
      churchesByMunicipality: {},
      churchesByClassification: {
        NCT: 0,
        ICP: 0,
        non_heritage: 0
      },
      visitorsByMonth: [],
      topChurches: [],
      recentActivity: {
        newChurches: 0,
        pendingReviews: 0,
        activeParishes: 0
      }
    };
  }

  /**
   * Get engagement metrics for the diocese
   */
  static async getEngagementMetrics(
    diocese: Diocese,
    startDate: Date,
    endDate: Date
  ): Promise<EngagementMetrics> {
    try {
      const analytics = await this.getDioceseAnalytics(diocese, startDate, endDate);

      // Get visitor logs for time-based analysis
      const visitorLogsRef = collection(db, 'church_visited');
      const visitorQuery = query(
        visitorLogsRef,
        where('visit_date', '>=', Timestamp.fromDate(startDate)),
        where('visit_date', '<=', Timestamp.fromDate(endDate)),
        orderBy('visit_date', 'desc')
      );

      const visitorSnapshot = await getDocs(visitorQuery);
      const visitorLogs: any[] = [];
      visitorSnapshot.forEach(doc => {
        const data = doc.data();
        // Only count validated in-person visits (user was within church vicinity)
        if (data.visit_status === 'validated') {
          visitorLogs.push({ id: doc.id, ...data });
        }
      });

      // Calculate peak periods by time of day
      const timeOfDayCounts = visitorLogs.reduce((acc, log) => {
        const timeOfDay = log.time_of_day || 'afternoon';
        acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxCount = Math.max(...Object.values(timeOfDayCounts));
      const peakVisitingPeriods = [
        {
          period: 'Morning (6AM - 12PM)',
          visitors: timeOfDayCounts.morning || 0,
          peak: timeOfDayCounts.morning === maxCount
        },
        {
          period: 'Afternoon (12PM - 6PM)',
          visitors: timeOfDayCounts.afternoon || 0,
          peak: timeOfDayCounts.afternoon === maxCount
        },
        {
          period: 'Evening (6PM - 10PM)',
          visitors: timeOfDayCounts.evening || 0,
          peak: timeOfDayCounts.evening === maxCount
        }
      ];

      // Get feedback for rating distribution
      const feedbackRef = collection(db, 'feedback');
      const feedbackQuery = query(
        feedbackRef,
        where('status', '==', 'published')
      );
      const feedbackSnapshot = await getDocs(feedbackQuery);
      const feedbackList: any[] = [];
      feedbackSnapshot.forEach(doc => {
        feedbackList.push({ id: doc.id, ...doc.data() });
      });

      // Rating distribution
      const ratingCounts = feedbackList.reduce((acc, f) => {
        const rating = f.rating || 3;
        acc[rating] = (acc[rating] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const totalFeedback = feedbackList.length || 1;
      const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: ratingCounts[rating] || 0,
        percentage: Math.round(((ratingCounts[rating] || 0) / totalFeedback) * 100)
      }));

      // Feedback by municipality
      const churchesRef = collection(db, 'churches');
      const churchesQuery = query(churchesRef, where('diocese', '==', diocese));
      const churchesSnapshot = await getDocs(churchesQuery);
      const churches: any[] = [];
      churchesSnapshot.forEach(doc => {
        churches.push({ id: doc.id, ...doc.data() });
      });

      const feedbackByMunicipality = feedbackList.reduce((acc, f) => {
        const church = churches.find(c => c.id === f.church_id);
        if (church) {
          const municipality = church.locationDetails?.municipality || church.municipality || 'Unknown';
          acc[municipality] = (acc[municipality] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Top rated churches
      const topRatedChurches = analytics.topChurches
        .filter(c => c.feedbackCount > 0)
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          rating: c.avgRating,
          feedbackCount: c.feedbackCount
        }));

      return {
        visitorTrends: analytics.visitorsByMonth,
        peakVisitingPeriods,
        ratingDistribution,
        feedbackByMunicipality,
        topRatedChurches
      };
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      // Return safe defaults
      return this.getEmptyEngagementMetrics();
    }
  }

  /**
   * Get empty engagement metrics (safe defaults)
   */
  private static getEmptyEngagementMetrics(): EngagementMetrics {
    return {
      visitorTrends: [],
      peakVisitingPeriods: [
        { period: 'Morning (6AM - 12PM)', visitors: 0, peak: false },
        { period: 'Afternoon (12PM - 6PM)', visitors: 0, peak: false },
        { period: 'Evening (6PM - 10PM)', visitors: 0, peak: false }
      ],
      ratingDistribution: [
        { rating: 5, count: 0, percentage: 0 },
        { rating: 4, count: 0, percentage: 0 },
        { rating: 3, count: 0, percentage: 0 },
        { rating: 2, count: 0, percentage: 0 },
        { rating: 1, count: 0, percentage: 0 }
      ],
      feedbackByMunicipality: {},
      topRatedChurches: []
    };
  }

  /**
   * Calculate monthly visitor counts
   */
  private static calculateMonthlyVisitors(visitorLogs: any[]): Array<{ month: string; visitors: number }> {
    const monthCounts = visitorLogs.reduce((acc, log) => {
      const date = log.visit_date?.toDate() || new Date();
      const monthKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthCounts)
      .map(([month, visitors]) => ({ month, visitors }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-6); // Last 6 months
  }

  /**
   * Get church summary data for reports
   */
  static async getChurchSummaryData(
    diocese: Diocese
  ): Promise<ChurchSummaryData[]> {
    const analytics = await this.getDioceseAnalytics(diocese);
    return analytics.topChurches;
  }
}
