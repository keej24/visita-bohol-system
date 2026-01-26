import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Star,
  Church,
  Filter,
  RefreshCw
} from 'lucide-react';
import { ChurchInfo, ChurchSummaryReport, EngagementAnalyticsReport, VisitorLog, FeedbackAnalytics } from './types';
import { format, subMonths } from 'date-fns';
import { AnalyticsService, AnalyticsData } from '@/services/analyticsService';
import { PDFExportService } from '@/services/pdfExportService';
import { ExcelExportService } from '@/services/excelExportService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';

interface ParishReportsProps {
  churchInfo: ChurchInfo;
  onClose: () => void;
}

export const ParishReports: React.FC<ParishReportsProps> = ({
  churchInfo,
  onClose
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('summary');
  const [dateRange, setDateRange] = useState({
    startDate: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Export confirmation dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pendingExport, setPendingExport] = useState<{
    reportType: 'summary' | 'engagement';
    format: 'pdf' | 'excel';
  } | null>(null);

  // Date range validation
  const isValidDateRange = useMemo(() => {
    const start = dateRange.startDate;
    const end = dateRange.endDate;
    if (!start || !end) return true; // Allow empty dates
    return start <= end;
  }, [dateRange.startDate, dateRange.endDate]);

  const dateRangeError = useMemo(() => {
    const start = dateRange.startDate;
    const end = dateRange.endDate;
    if (!start || !end) return null;
    if (start > end) {
      return "Invalid date range: Start date must be before or equal to end date.";
    }
    return null;
  }, [dateRange.startDate, dateRange.endDate]);

  // Check if there's any data to export
  const hasExportableData = useMemo(() => {
    if (!analyticsData) return false;
    const hasVisitors = analyticsData.visitorLogs && analyticsData.visitorLogs.length > 0;
    const hasFeedback = analyticsData.feedback && analyticsData.feedback.length > 0;
    return hasVisitors || hasFeedback;
  }, [analyticsData]);

  const noDataMessage = useMemo(() => {
    if (!analyticsData) return null;
    if (hasExportableData) return null;
    return "No data to export with current filters.";
  }, [analyticsData, hasExportableData]);

  // Load real analytics data from Firebase
  const loadAnalyticsData = useCallback(async () => {
    if (!churchInfo.id) {
      console.warn('No church ID provided for analytics');
      return;
    }

    // Validate date range before loading data
    if (!isValidDateRange) {
      console.log('❌ ParishReports: Invalid date range detected, skipping data load');
      toast({
        title: "Invalid Date Range",
        description: dateRangeError || "Please select a valid date range.",
        variant: "destructive",
      });
      setIsLoadingAnalytics(false);
      return;
    }
    
    setIsLoadingAnalytics(true);
    try {
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0); // Start of day
      
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      const data = await AnalyticsService.getChurchAnalytics(churchInfo.id, startDate, endDate);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [churchInfo.id, dateRange.startDate, dateRange.endDate, toast, isValidDateRange, dateRangeError]);

  // Load analytics data on component mount and date range change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const generateChurchSummaryReport = (): ChurchSummaryReport => {
    return {
      churchName: churchInfo.parishName || churchInfo.churchName,
      parishName: churchInfo.parishName || churchInfo.churchName,
      diocese: churchInfo.diocese,
      coordinates: churchInfo.coordinates,
      documentationDetails: {
        foundingYear: churchInfo.historicalDetails?.foundingYear || '',
        founders: churchInfo.historicalDetails?.founders || '',
        keyFigures: [],
        architecturalStyle: churchInfo.historicalDetails?.architecturalStyle || '',
        architecturalEvolution: 'Not documented',
        architecturalFeatures: churchInfo.historicalDetails?.architecturalFeatures || '',
        majorHistoricalEvents: churchInfo.historicalDetails?.majorHistoricalEvents
          ? [churchInfo.historicalDetails.majorHistoricalEvents]
          : [],
        heritageClassification: churchInfo.historicalDetails?.heritageClassification || 'None',
        heritageRecognitionRecords: [],
        heritageInformation: churchInfo.historicalDetails?.heritageInformation || '',
        preservationHistory: 'Not documented',
        restorationHistory: 'Not documented',
        religiousClassification: churchInfo.historicalDetails?.religiousClassification || 'None',
        historicalBackground: churchInfo.historicalDetails?.historicalBackground || ''
      },
      generatedDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
    };
  };

  const generateEngagementReport = (): EngagementAnalyticsReport => {
    if (!analyticsData) {
      // Return empty report if no data available
      return {
        dateRange,
        visitorStats: {
          totalVisitors: 0,
          averageDaily: 0,
          peakDay: 'N/A',
          peakTime: 'N/A',
          growthRate: 0
        },
        feedbackStats: {
          totalFeedback: 0,
          averageRating: 0,
          ratingTrend: 0,
          responseRate: 0
        },
        visualizations: {
          visitorHeatMap: [],
          trendData: [],
          peakPeriods: [
            { period: 'Morning (6AM-12PM)', count: 0 },
            { period: 'Afternoon (12PM-6PM)', count: 0 },
            { period: 'Evening (6PM-10PM)', count: 0 },
          ]
        },
        generatedDate: format(new Date(), 'yyyy-MM-dd hh:mm:ss a')
      };
    }

    // Calculate visitor statistics using real data
    const visitorStats = AnalyticsService.calculateVisitorStats(analyticsData.visitorLogs);
    const feedbackStats = AnalyticsService.calculateFeedbackStats(analyticsData.feedback);

    // Create visualizations from real data
    const visitorHeatMap = analyticsData.visitorLogs.map(log => ({
      date: format(log.visitDate, 'yyyy-MM-dd'),
      visitors: 1, // Each log represents one visit
      timeSlot: log.timeOfDay
    }));

    // Group visits by date for trend data
    const dailyVisits = analyticsData.visitorLogs.reduce((acc, log) => {
      const dateKey = format(log.visitDate, 'yyyy-MM-dd');
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(dailyVisits).map(([date, visitors]) => {
      const dayFeedback = analyticsData.feedback.filter(f =>
        format(f.createdAt, 'yyyy-MM-dd') === date
      );
      const avgRating = dayFeedback.length > 0
        ? dayFeedback.reduce((sum, f) => sum + f.rating, 0) / dayFeedback.length
        : 0;

      return {
        date,
        visitors,
        rating: Math.round(avgRating * 10) / 10
      };
    });

    return {
      dateRange,
      visitorStats: {
        totalVisitors: visitorStats.totalVisitors,
        averageDaily: visitorStats.averageDaily,
        peakDay: visitorStats.peakDay?.date || 'N/A',
        peakTime: visitorStats.peakTime,
        growthRate: 0 // Would need historical data to calculate actual growth
      },
      feedbackStats: {
        totalFeedback: feedbackStats.totalFeedback,
        averageRating: feedbackStats.averageRating,
        ratingTrend: 0, // Would need historical data to calculate trend
        responseRate: 100 // All feedback in our system is "responded" by being published
      },
      visualizations: {
        visitorHeatMap,
        trendData,
        peakPeriods: [
          { period: 'Morning (6AM-12PM)', count: visitorStats.timeBreakdown.morning || 0 },
          { period: 'Afternoon (12PM-6PM)', count: visitorStats.timeBreakdown.afternoon || 0 },
          { period: 'Evening (6PM-10PM)', count: visitorStats.timeBreakdown.evening || 0 },
        ]
      },
      generatedDate: format(new Date(), 'yyyy-MM-dd hh:mm:ss a')
    };
  };

  const handleGenerateReport = async (reportType: 'summary' | 'engagement') => {
    // Validate date range before generating report
    if (reportType === 'engagement' && !isValidDateRange) {
      toast({
        title: "Invalid Date Range",
        description: dateRangeError || "Please select a valid date range.",
        variant: "destructive",
      });
      return;
    }

    // Check if there's any data to export for engagement reports
    if (reportType === 'engagement' && !hasExportableData && analyticsData) {
      toast({
        title: "No Data to Export",
        description: "No data to export with current filters.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setPendingExport({
      reportType,
      format: reportType === 'engagement' ? exportFormat : 'pdf'
    });
    setShowExportDialog(true);
  };

  // Confirm and perform export
  const confirmExport = async () => {
    if (!pendingExport) return;

    setIsGenerating(true);
    setShowExportDialog(false);

    try {
      if (pendingExport.reportType === 'engagement') {
        // Reload analytics data with current date range
        await loadAnalyticsData();
        
        // Check if there's any data to export
        if (!hasExportableData) {
          toast({
            title: "No Data to Export",
            description: "No data to export with current filters.",
            variant: "destructive",
          });
          setIsGenerating(false);
          setPendingExport(null);
          return;
        }
        
        // Download the report in the selected format
        await handleDownloadReport('engagement', pendingExport.format);
        
        toast({
          title: "Report Exported",
          description: `Engagement & Feedback Analytics Report downloaded as ${pendingExport.format.toUpperCase()}!`
        });
      } else {
        // Generate and download summary report
        await handleDownloadReport('summary', pendingExport.format);
        
        toast({
          title: "Report Exported",
          description: `Church Summary Report has been downloaded as ${pendingExport.format.toUpperCase()}!`
        });
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setPendingExport(null);
    }
  };

  // Cancel export
  const cancelExport = () => {
    setShowExportDialog(false);
    setPendingExport(null);
  };

  const handleDownloadReport = async (reportType: 'summary' | 'engagement', format: 'pdf' | 'excel' = 'pdf') => {
    try {
      if (reportType === 'summary') {
        const summaryData = {
          churchName: churchInfo.churchName,
          parishName: churchInfo.parishName,
          diocese: churchInfo.diocese,
          coordinates: churchInfo.coordinates,
          locationDetails: churchInfo.locationDetails,
          historicalDetails: {
            foundingYear: churchInfo.historicalDetails?.foundingYear || '',
            founders: churchInfo.historicalDetails?.founders || '',
            architecturalStyle: churchInfo.historicalDetails?.architecturalStyle || '',
            historicalBackground: churchInfo.historicalDetails?.historicalBackground || '',
            majorHistoricalEvents: churchInfo.historicalDetails?.majorHistoricalEvents || '',
            heritageClassification: churchInfo.historicalDetails?.heritageClassification || 'None',
            religiousClassification: churchInfo.historicalDetails?.religiousClassification || 'None',
            architecturalFeatures: churchInfo.historicalDetails?.architecturalFeatures || '',
            heritageInformation: churchInfo.historicalDetails?.heritageInformation || ''
          },
          currentParishPriest: churchInfo.currentParishPriest || 'N/A',
          massSchedules: (churchInfo.massSchedules || []).map(schedule => ({
            day: schedule.day,
            time: schedule.time,
            endTime: schedule.endTime || '',
            language: schedule.language || 'Cebuano',
            isFbLive: schedule.isFbLive || false
          })),
          contactInfo: {
            phone: churchInfo.contactInfo?.phone || '',
            email: churchInfo.contactInfo?.email || ''
          }
        };

        if (format === 'excel') {
          // Export Church Summary as Excel
          ExcelExportService.exportChurchSummary(summaryData);
        } else {
          // Export Church Summary as PDF
          PDFExportService.exportChurchSummary(summaryData);
        }

        toast({
          title: "Download Complete",
          description: `Church Summary ${format.toUpperCase()} has been downloaded successfully!`
        });
        return;
      }

      // Export Analytics/Engagement Report
      if (!analyticsData) {
        toast({
          title: "No Data",
          description: "Please load the analytics data first.",
          variant: "destructive"
        });
        return;
      }

      // Check if there's any data to export
      if (!hasExportableData) {
        toast({
          title: "No Data to Export",
          description: "No data to export with current filters.",
          variant: "destructive"
        });
        return;
      }

      const dateRangeObj = {
        start: new Date(dateRange.startDate),
        end: new Date(dateRange.endDate)
      };

      const exportData = {
        visitorLogs: analyticsData.visitorLogs.map(log => ({
          id: log.id,
          visitDate: log.visitDate,
          timeOfDay: log.timeOfDay,
          deviceType: log.deviceType,
          userId: log.userId
        })),
        feedback: analyticsData.feedback.map(f => ({
          id: f.id,
          rating: f.rating,
          subject: f.subject || 'General Feedback',
          comment: f.message,
          date: f.createdAt,
          userName: 'Anonymous User',
          status: f.status
        })),
        stats: {
          totalVisitors: analyticsData.visitorLogs.length,
          avgDailyVisitors: Math.round((analyticsData.visitorLogs.length / Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)))) * 10) / 10,
          avgRating: analyticsData.feedback.length > 0 ? Math.round((analyticsData.feedback.reduce((sum, f) => sum + f.rating, 0) / analyticsData.feedback.length) * 10) / 10 : 0,
          growthRate: 0
        }
      };

      if (format === 'pdf') {
        await PDFExportService.exportAnalyticsReport(
          churchInfo.churchName,
          exportData,
          dateRangeObj
        );

        toast({
          title: "Download Complete",
          description: "Analytics Report PDF has been downloaded successfully!"
        });
      } else {
        ExcelExportService.exportAnalyticsReport(
          churchInfo.churchName,
          exportData,
          dateRangeObj
        );

        toast({
          title: "Download Complete",
          description: "Analytics Report Excel file has been downloaded successfully!"
        });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const summaryReport = generateChurchSummaryReport();
  const engagementReport = generateEngagementReport();

  // Chart color schemes
  const chartColors = {
    primary: '#059669',   // emerald-600
    secondary: '#14B8A6', // teal-500
    accent: '#F59E0B',
    purple: '#0D9488',    // teal-600
    red: '#EF4444',
    slate: '#64748B'
  };

  // Prepare chart data from analytics
  const prepareChartData = () => {
    if (!analyticsData) return { visitorTrendData: [], feedbackTrendData: [], peakHoursData: [], ratingDistributionData: [] };

    // Daily visitor trend data
    const dailyVisits = analyticsData.visitorLogs.reduce((acc, log) => {
      const dateKey = format(log.visitDate, 'MMM dd');
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const visitorTrendData = Object.entries(dailyVisits)
      .sort(([a], [b]) => new Date(a + ', 2024').getTime() - new Date(b + ', 2024').getTime())
      .map(([date, visitors]) => ({ date, visitors }));

    // Daily feedback trend data
    const dailyFeedback = analyticsData.feedback.reduce((acc, feedback) => {
      const dateKey = format(feedback.createdAt, 'MMM dd');
      if (!acc[dateKey]) acc[dateKey] = { date: dateKey, count: 0, averageRating: 0, totalRating: 0 };
      acc[dateKey].count += 1;
      acc[dateKey].totalRating += feedback.rating;
      acc[dateKey].averageRating = acc[dateKey].totalRating / acc[dateKey].count;
      return acc;
    }, {} as Record<string, { date: string; count: number; averageRating: number; totalRating: number }>);

    const feedbackTrendData = Object.values(dailyFeedback)
      .sort((a, b) => new Date(a.date + ', 2024').getTime() - new Date(b.date + ', 2024').getTime());

    // Peak hours data
    const timeStats = AnalyticsService.calculateVisitorStats(analyticsData.visitorLogs).timeBreakdown;
    const peakHoursData = [
      { period: 'Morning', count: timeStats.morning || 0, hours: '6AM-12PM' },
      { period: 'Afternoon', count: timeStats.afternoon || 0, hours: '12PM-6PM' },
      { period: 'Evening', count: timeStats.evening || 0, hours: '6PM-10PM' }
    ];

    // Rating distribution data
    const ratingStats = AnalyticsService.calculateFeedbackStats(analyticsData.feedback).ratingDistribution;
    const ratingDistributionData = Object.entries(ratingStats).map(([rating, count]) => ({
      rating: `${rating} Star${parseInt(rating) > 1 ? 's' : ''}`,
      count,
      percentage: Math.round((count / analyticsData.feedback.length) * 100)
    }));

    return { visitorTrendData, feedbackTrendData, peakHoursData, ratingDistributionData };
  };

  const chartData = prepareChartData();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parish Reports</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive reporting for {churchInfo.churchName}
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Back to Dashboard
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Church Summary Report
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Engagement & Analytics
          </TabsTrigger>
        </TabsList>

        {/* Church Summary Report */}
        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Church className="w-5 h-5" />
                Church Summary Report
              </CardTitle>
              <CardDescription>
                Comprehensive documentation details, heritage classification, and historical background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Actions */}
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => handleDownloadReport('summary', 'pdf')}
                  disabled={isGenerating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? 'Exporting...' : 'Download PDF'}
                </Button>
              </div>

              {/* Basic Church Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Church Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Parish Name</Label>
                      <p className="text-lg font-semibold">{summaryReport.parishName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Location</Label>
                      <p>{churchInfo.locationDetails.streetAddress}, {churchInfo.locationDetails.barangay}</p>
                      <p>{churchInfo.locationDetails.municipality}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Classifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Heritage Classification</Label>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {summaryReport.documentationDetails.heritageClassification}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Religious Classification</Label>
                      <Badge variant="secondary" className="bg-teal-100 text-teal-800">
                        {summaryReport.documentationDetails.religiousClassification}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Founding Year</Label>
                      <p className="text-lg font-semibold">{summaryReport.documentationDetails.foundingYear}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Architectural Style</Label>
                      <p>{summaryReport.documentationDetails.architecturalStyle}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Historical Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Historical Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Founders</Label>
                      <p className="mt-1">{summaryReport.documentationDetails.founders || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Founding Year</Label>
                      <p className="mt-1">{summaryReport.documentationDetails.foundingYear || 'Not specified'}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Historical Background</Label>
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{summaryReport.documentationDetails.historicalBackground || 'Not documented'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Architectural & Heritage Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Architectural & Heritage Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summaryReport.documentationDetails.architecturalFeatures && (
                    <div>
                      <Label className="text-sm font-medium">Architectural Features</Label>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">{summaryReport.documentationDetails.architecturalFeatures}</p>
                    </div>
                  )}

                  {summaryReport.documentationDetails.heritageInformation && (
                    <div>
                      <Label className="text-sm font-medium">Heritage Information</Label>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">{summaryReport.documentationDetails.heritageInformation}</p>
                    </div>
                  )}

                  {summaryReport.documentationDetails.majorHistoricalEvents.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Major Historical Events</Label>
                      <p className="mt-1 text-gray-700 whitespace-pre-wrap">{summaryReport.documentationDetails.majorHistoricalEvents.join('\n')}</p>
                    </div>
                  )}

                  {!summaryReport.documentationDetails.architecturalFeatures &&
                   !summaryReport.documentationDetails.heritageInformation &&
                   summaryReport.documentationDetails.majorHistoricalEvents.length === 0 && (
                    <p className="text-gray-500 italic">No architectural or heritage information documented</p>
                  )}
                </CardContent>
              </Card>

              {/* Report Metadata */}
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Report Generated: {summaryReport.generatedDate}</span>
                    <span>Report Type: Church Summary Report</span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement & Analytics Report */}
        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Engagement & Feedback Analytics Report
              </CardTitle>
              <CardDescription>
                Visitor logs, feedback analysis, and trend visualizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Report Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Export Format</Label>
                      <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'pdf' | 'excel')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Document</SelectItem>
                          <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <Button
                        onClick={() => handleGenerateReport('engagement')}
                        disabled={isGenerating || isLoadingAnalytics || !isValidDateRange || (analyticsData !== null && !hasExportableData)}
                        className="w-full h-10 bg-green-600 hover:bg-green-700"
                      >
                        {(isGenerating || isLoadingAnalytics) ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Export Report
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Date Range Error Message */}
                  {dateRangeError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <span className="text-red-600 text-sm font-medium">⚠️ {dateRangeError}</span>
                    </div>
                  )}

                  {/* No Data Message */}
                  {!dateRangeError && noDataMessage && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <span className="text-yellow-700 text-sm font-medium">ℹ️ {noDataMessage}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Visitor Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-2xl font-bold text-emerald-900">{engagementReport.visitorStats.totalVisitors}</p>
                        <p className="text-sm text-emerald-700">Total Visitors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-900">{engagementReport.visitorStats.averageDaily}</p>
                        <p className="text-sm text-green-700">Daily Average</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-teal-200 bg-teal-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-teal-600" />
                      <div>
                        <p className="text-2xl font-bold text-teal-900">{engagementReport.feedbackStats.averageRating}</p>
                        <p className="text-sm text-teal-700">Avg Rating</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold text-orange-900">{engagementReport.visitorStats.growthRate}%</p>
                        <p className="text-sm text-orange-700">Growth Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feedback Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feedback Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Feedback</span>
                    <Badge variant="secondary">{engagementReport.feedbackStats.totalFeedback}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rating Trend</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">+{engagementReport.feedbackStats.ratingTrend}</Badge>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visitor Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Daily Visitor Trends
                  </CardTitle>
                  <CardDescription>
                    Visitor patterns over the selected date range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {isLoadingAnalytics ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center space-y-2">
                          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                          <p className="text-sm text-gray-500">Loading chart data...</p>
                        </div>
                      </div>
                    ) : chartData.visitorTrendData.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No visitor data available for the selected period</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.visitorTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                          <YAxis stroke="#6B7280" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#F9FAFB',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="visitors"
                            stroke={chartColors.primary}
                            fill={chartColors.primary}
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Peak Hours Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-green-600" />
                      Peak Visiting Hours
                    </CardTitle>
                    <CardDescription>
                      Most popular times for church visits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.peakHoursData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="period" stroke="#6B7280" fontSize={12} />
                          <YAxis stroke="#6B7280" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#F9FAFB',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px'
                            }}
                            formatter={(value, name) => [value, 'Visitors']}
                            labelFormatter={(label) => {
                              const period = chartData.peakHoursData.find(p => p.period === label);
                              return `${label} (${period?.hours})`;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill={chartColors.secondary}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Rating Distribution Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-teal-600" />
                      Rating Distribution
                    </CardTitle>
                    <CardDescription>
                      Breakdown of visitor feedback ratings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.ratingDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="rating"
                            label={({ rating, percentage }) => `${rating}: ${percentage}%`}
                          >
                            {chartData.ratingDistributionData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={[
                                  chartColors.red,
                                  chartColors.accent,
                                  chartColors.slate,
                                  chartColors.secondary,
                                  chartColors.primary
                                ][index % 5]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name, props) => [
                              `${value} reviews (${props.payload.percentage}%)`,
                              props.payload.rating
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Report Metadata */}
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Report Generated: {engagementReport.generatedDate}</span>
                    <span>Date Range: {engagementReport.dateRange.startDate} to {engagementReport.dateRange.endDate}</span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Confirmation Dialog */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Export</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to export the <strong>{pendingExport?.reportType === 'summary' ? 'Church Summary' : 'Engagement & Feedback Analytics'}</strong> report as a <strong>{pendingExport?.format === 'pdf' ? 'PDF document' : 'Excel spreadsheet'}</strong>.
              <br /><br />
              {pendingExport?.reportType === 'engagement' && (
                <>
                  <strong>Date Range:</strong> {format(new Date(dateRange.startDate), 'MMM dd, yyyy')} - {format(new Date(dateRange.endDate), 'MMM dd, yyyy')}
                  <br /><br />
                </>
              )}
              <strong>Church:</strong> {churchInfo.parishName || churchInfo.churchName}
              <br /><br />
              This report will be downloaded to your device. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelExport}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};