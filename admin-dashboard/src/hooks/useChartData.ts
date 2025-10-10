import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/data-management/queryClient';
import { 
  ChurchStatusData,
  MonthlyTrendData,
  DioceseComparisonData,
  HeritageProgressData,
  ActivityTimelineData,
  QuickStatData,
} from '@/components/charts/ChartComponents';

// Mock data generator functions - replace with actual API calls
const generateMockChurchStatusData = (diocese?: string): ChurchStatusData[] => {
  return [
    { status: 'approved', count: 45, percentage: 52.3 },
    { status: 'pending', count: 23, percentage: 26.7 },
    { status: 'heritage_review', count: 12, percentage: 14.0 },
    { status: 'needs_revision', count: 6, percentage: 7.0 },
  ];
};

const generateMockMonthlyTrendData = (diocese?: string): MonthlyTrendData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => ({
    month,
    submissions: Math.floor(Math.random() * 15) + 5,
    approvals: Math.floor(Math.random() * 12) + 3,
    rejections: Math.floor(Math.random() * 5) + 1,
  }));
};

const generateMockDioceseComparisonData = (): DioceseComparisonData[] => {
  return [
    {
      diocese: 'Tagbilaran',
      totalChurches: 86,
      approved: 52,
      pending: 23,
      heritageClassified: 15,
    },
    {
      diocese: 'Talibon',
      totalChurches: 64,
      approved: 38,
      pending: 18,
      heritageClassified: 8,
    },
  ];
};

const generateMockHeritageProgressData = (diocese?: string): HeritageProgressData[] => {
  return [
    {
      classification: 'Important Cultural Property (ICP)',
      current: 12,
      target: 20,
      percentage: 60,
    },
    {
      classification: 'National Cultural Treasure (NCT)',
      current: 3,
      target: 8,
      percentage: 37.5,
    },
  ];
};

const generateMockActivityTimelineData = (dateRange: string): ActivityTimelineData[] => {
  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: Math.floor(Math.random() * 5) + 1,
      reviews: Math.floor(Math.random() * 8) + 2,
      approvals: Math.floor(Math.random() * 3) + 1,
    });
  }
  
  return data;
};

// Hook for church status distribution data
export const useChurchStatusData = (diocese?: string) => {
  return useQuery({
    queryKey: ['charts', 'church-status', diocese],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return generateMockChurchStatusData(diocese);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook for monthly trend data
export const useMonthlyTrendData = (diocese?: string) => {
  return useQuery({
    queryKey: ['charts', 'monthly-trend', diocese],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return generateMockMonthlyTrendData(diocese);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Hook for diocese comparison data
export const useDioceseComparisonData = () => {
  return useQuery({
    queryKey: ['charts', 'diocese-comparison'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      return generateMockDioceseComparisonData();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Hook for heritage progress data
export const useHeritageProgressData = (diocese?: string) => {
  return useQuery({
    queryKey: ['charts', 'heritage-progress', diocese],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 900));
      return generateMockHeritageProgressData(diocese);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  });
};

// Hook for activity timeline data
export const useActivityTimelineData = (dateRange: '7d' | '30d' | '90d' | '1y' = '30d') => {
  return useQuery({
    queryKey: ['charts', 'activity-timeline', dateRange],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return generateMockActivityTimelineData(dateRange);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for quick stats data
export const useQuickStatsData = (diocese?: string) => {
  const { data: statusData } = useChurchStatusData(diocese);
  const { data: trendData } = useMonthlyTrendData(diocese);
  
  return useMemo((): QuickStatData[] => {
    if (!statusData || !trendData) return [];
    
    const totalChurches = statusData.reduce((sum, item) => sum + item.count, 0);
    const approvedChurches = statusData.find(item => item.status === 'approved')?.count || 0;
    const pendingChurches = statusData.find(item => item.status === 'pending')?.count || 0;
    const heritageChurches = statusData.find(item => item.status === 'heritage_review')?.count || 0;
    
    // Calculate trends from monthly data
    const recentSubmissions = trendData.slice(-3).map(d => d.submissions);
    const previousSubmissions = trendData.slice(-6, -3).map(d => d.submissions);
    const submissionChange = ((recentSubmissions.reduce((a, b) => a + b, 0) / recentSubmissions.length) -
                            (previousSubmissions.reduce((a, b) => a + b, 0) / previousSubmissions.length)) /
                            (previousSubmissions.reduce((a, b) => a + b, 0) / previousSubmissions.length) * 100;
    
    return [
      {
        label: 'Total Churches',
        value: totalChurches,
        change: 5.2,
        changeType: 'increase',
        trend: trendData.map(d => d.submissions + d.approvals),
      },
      {
        label: 'Approved Churches',
        value: approvedChurches,
        change: 8.1,
        changeType: 'increase',
        trend: trendData.map(d => d.approvals),
      },
      {
        label: 'Pending Reviews',
        value: pendingChurches,
        change: -12.3,
        changeType: 'decrease',
        trend: trendData.map(d => d.submissions),
      },
      {
        label: 'Heritage Classified',
        value: heritageChurches,
        change: 15.7,
        changeType: 'increase',
        trend: [8, 9, 10, 11, 11, 12],
      },
    ];
  }, [statusData, trendData]);
};

// Hook for comprehensive dashboard data
export const useDashboardChartsData = (diocese?: string) => {
  const churchStatusQuery = useChurchStatusData(diocese);
  const monthlyTrendQuery = useMonthlyTrendData(diocese);
  const dioceseComparisonQuery = useDioceseComparisonData();
  const heritageProgressQuery = useHeritageProgressData(diocese);
  const activityTimelineQuery = useActivityTimelineData();
  const quickStatsData = useQuickStatsData(diocese);
  
  const isLoading = churchStatusQuery.isLoading || 
                   monthlyTrendQuery.isLoading || 
                   dioceseComparisonQuery.isLoading || 
                   heritageProgressQuery.isLoading ||
                   activityTimelineQuery.isLoading;
  
  const hasError = churchStatusQuery.error || 
                   monthlyTrendQuery.error || 
                   dioceseComparisonQuery.error || 
                   heritageProgressQuery.error ||
                   activityTimelineQuery.error;
  
  const refetchAll = () => {
    churchStatusQuery.refetch();
    monthlyTrendQuery.refetch();
    dioceseComparisonQuery.refetch();
    heritageProgressQuery.refetch();
    activityTimelineQuery.refetch();
  };
  
  return {
    data: {
      churchStatus: churchStatusQuery.data,
      monthlyTrend: monthlyTrendQuery.data,
      dioceseComparison: dioceseComparisonQuery.data,
      heritageProgress: heritageProgressQuery.data,
      activityTimeline: activityTimelineQuery.data,
      quickStats: quickStatsData,
    },
    isLoading,
    hasError,
    refetchAll,
    queries: {
      churchStatus: churchStatusQuery,
      monthlyTrend: monthlyTrendQuery,
      dioceseComparison: dioceseComparisonQuery,
      heritageProgress: heritageProgressQuery,
      activityTimeline: activityTimelineQuery,
    },
  };
};

// Hook for chart data with real-time updates
export const useRealtimeChartData = (diocese?: string) => {
  const dashboardData = useDashboardChartsData(diocese);
  
  // Set up periodic refresh for real-time feel
  const { refetch } = useQuery({
    queryKey: ['charts', 'realtime-refresh'],
    queryFn: () => Promise.resolve(null),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: false, // Don't fetch, just use for interval
  });
  
  // Trigger dashboard data refresh
  React.useEffect(() => {
    const interval = setInterval(() => {
      dashboardData.refetchAll();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dashboardData.refetchAll]);
  
  return dashboardData;
};

// Hook for exportable chart data
export const useExportableChartData = (diocese?: string) => {
  const { data } = useDashboardChartsData(diocese);
  
  const exportData = useMemo(() => ({
    churchStatus: data.churchStatus?.map(item => ({
      Status: item.status.replace('_', ' ').toUpperCase(),
      Count: item.count,
      Percentage: `${item.percentage}%`,
    })),
    monthlyTrend: data.monthlyTrend?.map(item => ({
      Month: item.month,
      'New Submissions': item.submissions,
      'Approvals': item.approvals,
      'Revision Requests': item.rejections,
    })),
    dioceseComparison: data.dioceseComparison?.map(item => ({
      Diocese: item.diocese,
      'Total Churches': item.totalChurches,
      'Approved Churches': item.approved,
      'Pending Churches': item.pending,
      'Heritage Classified': item.heritageClassified,
    })),
    heritageProgress: data.heritageProgress?.map(item => ({
      Classification: item.classification,
      'Current Count': item.current,
      'Target Count': item.target,
      'Progress Percentage': `${item.percentage}%`,
    })),
  }), [data]);
  
  return exportData;
};

// Custom hook for chart performance monitoring
export const useChartPerformance = () => {
  const [renderTimes, setRenderTimes] = React.useState<{ [key: string]: number }>({});
  
  const trackRenderTime = (chartType: string, startTime: number) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    setRenderTimes(prev => ({
      ...prev,
      [chartType]: renderTime,
    }));
    
    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Chart ${chartType} rendered in ${renderTime.toFixed(2)}ms`);
    }
  };
  
  return { renderTimes, trackRenderTime };
};

export default {
  useChurchStatusData,
  useMonthlyTrendData,
  useDioceseComparisonData,
  useHeritageProgressData,
  useActivityTimelineData,
  useQuickStatsData,
  useDashboardChartsData,
  useRealtimeChartData,
  useExportableChartData,
  useChartPerformance,
};
