import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Diocese } from '@/contexts/AuthContext';

// Internal visitor log type
interface VisitorLog {
  id?: string;
  church_id?: string;
  visit_date?: Timestamp | { seconds: number };
  user_id?: string;
  visit_status?: string;
  [key: string]: unknown;
}

// Internal feedback type
interface FeedbackDocument {
  id?: string;
  church_id?: string;
  rating?: number;
  date_submitted?: Timestamp | { toDate?(): Date; seconds?: number };
  [key: string]: unknown;
}

// Internal church data type from Firestore
interface ChurchDocument {
  id: string;
  name?: string;
  churchName?: string;
  classification?: 'NCT' | 'ICP' | 'non_heritage' | string;
  heritageClassification?: 'NCT' | 'ICP' | 'non_heritage' | string;
  municipality?: string;
  foundingYear?: string | number;
  status?: string;
  createdAt?: Timestamp | { toDate(): Date };
  founders?: string[];
  architecturalStyle?: string;
  majorEvents?: string[];
  preservationHistory?: string[];
  longitude?: number;
  latitude?: number;
  basicInfo?: {
    churchName?: string;
    diocese?: string;
  };
  locationDetails?: {
    municipality?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  location?: {
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  historicalDetails?: {
    foundingYear?: string | number;
    founders?: string[] | string;
    architecturalStyle?: string;
    majorEvents?: string[];
    majorHistoricalEvents?: string;
    preservationHistory?: string[];
    architecturalFeatures?: string;
    heritageInformation?: string;
    historicalBackground?: string;
  };
  historicalBackground?: string | {
    foundingYear?: string | number;
    founders?: string[];
    majorEvents?: string[];
    preservationHistory?: string[];
  };
  architecture?: {
    style?: string;
  };
  [key: string]: unknown;
}

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
  architecturalFeatures?: string;
  heritageStatus?: string;
  heritageInformation?: string;
  historicalBackground?: string;
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
      console.log(`🔍 Fetching approved churches for diocese: ${diocese}`);

      // Fetch only approved churches in the diocese
      const churchesRef = collection(db, 'churches');
      const churchesQuery = query(
        churchesRef,
        where('diocese', '==', diocese),
        where('status', '==', 'approved')
      );
      const churchesSnapshot = await getDocs(churchesQuery);

      console.log(`📥 Firestore returned ${churchesSnapshot.size} documents`);

      const churches: ChurchDocument[] = [];

      // If no results with 'diocese' field, try alternate field names
      if (churchesSnapshot.empty) {
        console.log('⚠️ No churches found with "diocese" field, trying alternate queries...');

        // Try with basicInfo.diocese
        const altQuery = query(churchesRef, where('basicInfo.diocese', '==', diocese));
        const altSnapshot = await getDocs(altQuery);

        if (!altSnapshot.empty) {
          console.log(`✅ Found ${altSnapshot.size} churches using "basicInfo.diocese" field`);
          // Use alternate snapshot
          altSnapshot.forEach(doc => {
            churches.push({ id: doc.id, ...doc.data() } as ChurchDocument);
          });
        }
      } else {
        churchesSnapshot.forEach(doc => {
          churches.push({ id: doc.id, ...doc.data() } as ChurchDocument);
        });
      }

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
      const visitorLogs: VisitorLog[] = [];
      visitorSnapshot.forEach(doc => {
        const data = doc.data();
        const church = churches.find(c => c.id === data.church_id);
        // Only count validated in-person visits (user was within church vicinity)
        if (church && data.visit_status === 'validated') {
          visitorLogs.push({ id: doc.id, ...data } as VisitorLog);
        }
      });

      // Get feedback for all churches (filtered by date range if provided)
      const feedbackRef = collection(db, 'feedback');
      const feedbackQuery = query(
        feedbackRef,
        where('status', '==', 'published'),
        orderBy('date_submitted', 'desc')
      );

      const feedbackSnapshot = await getDocs(feedbackQuery);
      const feedbackList: FeedbackDocument[] = [];
      feedbackSnapshot.forEach(doc => {
        const data = doc.data();
        // Match feedback by ID or by church name (feedback might use church name as ID)
        const church = churches.find(c => 
          c.id === data.church_id || 
          c.id === data.churchId ||
          c.churchName === data.church_id ||
          c.name === data.church_id ||
          (c.basicInfo?.churchName === data.church_id)
        );
        if (church) {
          // Apply date filtering in-memory if date range is provided
          if (startDate && endDate && data.date_submitted) {
            const feedbackDate = data.date_submitted.toDate();
            if (feedbackDate >= startDate && feedbackDate <= endDate) {
              feedbackList.push({ id: doc.id, ...data });
            }
          } else if (!startDate && !endDate) {
            // No date filter, include all
            feedbackList.push({ id: doc.id, ...data });
          }
        }
      });

      console.log(`📊 Diocese Analytics: Feedback filtering - Total published: ${feedbackSnapshot.size}, Matched churches: ${feedbackList.length}, Date range: ${startDate?.toLocaleDateString()} - ${endDate?.toLocaleDateString()}`);
      if (feedbackList.length > 0) {
        console.log('✅ Sample matched feedback:', { 
          id: feedbackList[0].id, 
          church_id: feedbackList[0].church_id, 
          rating: feedbackList[0].rating,
          date: feedbackList[0].date_submitted?.toDate?.()
        });
        console.log(`✅ Total ratings found: ${feedbackList.length}, Avg rating: ${(feedbackList.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackList.length).toFixed(1)}`);
      } else {
        console.log('⚠️ No feedback found. Total churches:', churches.length, 'Church IDs:', churches.map(c => c.id));
        if (feedbackSnapshot.size > 0) {
          const firstFeedback = feedbackSnapshot.docs[0].data();
          console.log('❌ Sample feedback from DB (not matched):', {
            church_id: firstFeedback.church_id,
            churchId: firstFeedback.churchId,
            status: firstFeedback.status,
            rating: firstFeedback.rating,
            date: firstFeedback.date_submitted?.toDate?.()
          });
          console.log('🔍 Looking for church with ID:', firstFeedback.church_id || firstFeedback.churchId);
          console.log('🔍 Available church IDs:', churches.map(c => ({ id: c.id, name: c.churchName || c.name })));
        }
      }

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
        // Match feedback by ID or church name
        const churchFeedback = feedbackList.filter(f => 
          f.church_id === church.id || 
          f.church_id === church.churchName ||
          f.church_id === church.name ||
          f.church_id === church.basicInfo?.churchName
        );
        const churchAvgRating = churchFeedback.length > 0
          ? churchFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / churchFeedback.length
          : 0;

        // Extract founding year from various possible field locations
        // Note: historicalBackground can be either a string or an object
        const historicalBgObj = (typeof church.historicalBackground === 'object' && church.historicalBackground !== null 
          ? church.historicalBackground 
          : null) as { foundingYear?: string | number; founders?: string[]; majorEvents?: string[]; preservationHistory?: string[] } | null;
        
        const foundingYear =
          (typeof church.historicalDetails?.foundingYear === 'number' 
            ? church.historicalDetails.foundingYear 
            : parseInt(String(church.historicalDetails?.foundingYear || ''))) ||
          (typeof church.foundingYear === 'number'
            ? church.foundingYear
            : parseInt(String(church.foundingYear || ''))) ||
          (historicalBgObj && typeof historicalBgObj.foundingYear === 'number'
            ? historicalBgObj.foundingYear
            : parseInt(String(historicalBgObj?.foundingYear || ''))) ||
          1900;

        // Extract founders from various possible field locations (may be string or array)
        const foundersRaw =
          church.historicalDetails?.founders ||
          (historicalBgObj?.founders) ||
          church.founders ||
          '';
        // Convert founders to array format (may be stored as comma-separated string)
        const founders = Array.isArray(foundersRaw) 
          ? foundersRaw 
          : typeof foundersRaw === 'string' && foundersRaw.trim()
            ? [foundersRaw.trim()]  // Keep as single entry, don't split
            : [];

        // Extract historical background text
        const historicalBackground =
          church.historicalDetails?.historicalBackground ||
          (typeof church.historicalBackground === 'string' ? church.historicalBackground : '') ||
          church.description ||
          '';

        // Extract architectural style
        const architecturalStyle =
          church.historicalDetails?.architecturalStyle ||
          church.architecturalStyle ||
          church.architecture?.style ||
          'Unknown';

        // Extract major events (may be stored as culturalSignificance or majorHistoricalEvents string)
        const majorEventsRaw =
          church.historicalDetails?.majorEvents ||
          church.historicalDetails?.majorHistoricalEvents ||
          church.culturalSignificance ||
          church.majorEvents ||
          '';
        // Convert majorEvents to array format
        const majorEvents = Array.isArray(majorEventsRaw)
          ? majorEventsRaw
          : typeof majorEventsRaw === 'string' && majorEventsRaw.trim()
            ? [majorEventsRaw.trim()]  // Keep as single entry
            : [];

        // Extract preservation history
        const preservationHistory =
          church.historicalDetails?.preservationHistory ||
          (historicalBgObj?.preservationHistory) ||
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
          municipality: church.locationDetails?.municipality || church.municipality || 'Unknown',
          foundingYear,
          classification: (church.classification || church.heritageClassification || 'non_heritage') as 'NCT' | 'ICP' | 'non_heritage',
          visitorCount: churchVisitors,
          avgRating: Math.round(churchAvgRating * 10) / 10,
          feedbackCount: churchFeedback.length,
          status: (church.status || 'active') as string,
          coordinates,
          founders,
          architecturalStyle,
          architecturalFeatures: church.historicalDetails?.architecturalFeatures || church.architecturalFeatures || '',
          heritageStatus: church.classification === 'NCT' ? 'National Cultural Treasure' :
                          church.classification === 'ICP' ? 'Important Cultural Property' :
                          'Regular Church',
          heritageInformation: church.historicalDetails?.heritageInformation || church.heritageInformation || '',
          historicalBackground: typeof historicalBackground === 'string' ? historicalBackground : '',
          majorEvents,
          preservationHistory
        };
      });

      // Sort ALL churches by visitor count (not just top 10)
      const topChurches = churchVisitorCounts
        .sort((a, b) => b.visitorCount - a.visitorCount) as ChurchSummaryData[];

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
      const visitorLogs: VisitorLog[] = [];
      visitorSnapshot.forEach(doc => {
        const data = doc.data();
        // Only count validated in-person visits (user was within church vicinity)
        if (data.visit_status === 'validated') {
          visitorLogs.push({ id: doc.id, ...data } as VisitorLog);
        }
      });

      // Calculate peak periods by time of day
      const timeOfDayCounts = visitorLogs.reduce((acc, log) => {
        const timeOfDay = (log.time_of_day as string) || 'afternoon';
        acc[timeOfDay] = (acc[timeOfDay] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxCount = Math.max(...Object.values(timeOfDayCounts) as number[]);
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

      // Get feedback for rating distribution (filtered by date range in-memory)
      const feedbackRef = collection(db, 'feedback');
      const feedbackQuery = query(
        feedbackRef,
        where('status', '==', 'published'),
        orderBy('date_submitted', 'desc')
      );
      const feedbackSnapshot = await getDocs(feedbackQuery);
      const feedbackList: FeedbackDocument[] = [];
      feedbackSnapshot.forEach(doc => {
        const data = doc.data();
        // Apply date filtering in-memory
        if (data.date_submitted) {
          const feedbackDate = (data.date_submitted as Timestamp).toDate();
          if (feedbackDate >= startDate && feedbackDate <= endDate) {
            feedbackList.push({ id: doc.id, ...data } as FeedbackDocument);
          }
        }
      });

      console.log(`📊 Engagement Metrics: Feedback filtering - Total: ${feedbackSnapshot.size}, Filtered: ${feedbackList.length}, Date range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

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
      const churchesQuery = query(
        churchesRef, 
        where('diocese', '==', diocese),
        where('status', '==', 'approved')
      );
      const churchesSnapshot = await getDocs(churchesQuery);
      const churches: ChurchDocument[] = [];
      churchesSnapshot.forEach(doc => {
        churches.push({ id: doc.id, ...doc.data() } as ChurchDocument);
      });

      const feedbackByMunicipality = feedbackList.reduce((acc, f) => {
        // Match feedback by ID or church name
        const church = churches.find(c => 
          c.id === f.church_id || 
          c.churchName === f.church_id ||
          c.name === f.church_id ||
          c.basicInfo?.churchName === f.church_id
        );
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
  private static calculateMonthlyVisitors(visitorLogs: VisitorLog[]): Array<{ month: string; visitors: number }> {
    const monthCounts = visitorLogs.reduce((acc, log) => {
      const date = (log.visit_date as Timestamp)?.toDate() || new Date();
      const monthKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthCounts)
      .map(([month, visitors]) => ({ month, visitors: visitors as number }))
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
