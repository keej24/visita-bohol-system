import React, { useState, useMemo, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { HybridHeatmap } from '../components/heatmap/HybridHeatmap';
import { DioceseAnalyticsService, type DioceseAnalytics, type EngagementMetrics, type ChurchSummaryData } from '@/services/dioceseAnalyticsService';
import { PDFExportService } from '@/services/pdfExportService';
import { ExcelExportService } from '@/services/excelExportService';
import { DioceseReportService } from '@/services/dioceseReportService';
import { 
  Building2, 
  BarChart3, 
  Map, 
  Filter, 
  Download, 
  Church, 
  Award, 
  Users, 
  Star, 
  Clock, 
  MapPin, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Activity, 
  PieChart, 
  Eye 
} from 'lucide-react';

// Note: All data is now fetched from Firestore via DioceseAnalyticsService

const Reports = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 3));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<string>('church_summary');
  const [selectedParish, setSelectedParish] = useState<string>('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  const [activeTab, setActiveTab] = useState<string>('church_summary');

  // Real data state
  const [dioceseAnalytics, setDioceseAnalytics] = useState<DioceseAnalytics | null>(null);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [churchSummaryData, setChurchSummaryData] = useState<ChurchSummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if user is parish secretary (limited to own church) or chancery (diocesan-wide)
  const isParishSecretary = userProfile?.role === 'parish_secretary';
  const currentDiocese = userProfile?.diocese || 'tagbilaran';

  // Report type options based on user role
  const reportTypes = [
    { value: "church_summary", label: "Church Summary Report" },
    { value: "engagement_analytics", label: "Engagement & Feedback Analytics Report" }
  ];

  // Load diocese analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!currentDiocese) return;

      setIsLoading(true);
      try {
        const [analytics, engagement, churches] = await Promise.all([
          DioceseAnalyticsService.getDioceseAnalytics(currentDiocese, startDate, endDate),
          DioceseAnalyticsService.getEngagementMetrics(currentDiocese, startDate, endDate),
          DioceseAnalyticsService.getChurchSummaryData(currentDiocese)
        ]);

        setDioceseAnalytics(analytics);
        setEngagementMetrics(engagement);
        setChurchSummaryData(churches);
      } catch (error) {
        console.error('Error loading analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load analytics data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [currentDiocese, startDate, endDate, toast]);

  // Get filtered churches data
  const availableChurches = useMemo(() => {
    if (!churchSummaryData) return [];

    if (isParishSecretary && userProfile?.parish) {
      return churchSummaryData.filter(church => church.id === userProfile.parish);
    }

    let filtered = churchSummaryData;

    if (selectedClassification !== 'all') {
      filtered = filtered.filter(c => c.classification === selectedClassification);
    }

    return filtered;
  }, [churchSummaryData, isParishSecretary, userProfile?.parish, selectedClassification]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!dioceseAnalytics) {
      return {
        totalChurches: 0,
        icpCount: 0,
        nctCount: 0,
        nonHeritageCount: 0,
        totalVisitors: 0,
        avgRating: '0.0',
        totalFeedback: 0
      };
    }

    return {
      totalChurches: dioceseAnalytics.totalChurches,
      icpCount: dioceseAnalytics.churchesByClassification.ICP,
      nctCount: dioceseAnalytics.churchesByClassification.NCT,
      nonHeritageCount: dioceseAnalytics.nonHeritageChurches,
      totalVisitors: dioceseAnalytics.totalVisitors,
      avgRating: dioceseAnalytics.avgRating.toFixed(1),
      totalFeedback: dioceseAnalytics.totalFeedback
    };
  }, [dioceseAnalytics]);

  // Handle export functionality with real exports
  const handleExport = async (format: string, reportType: string) => {
    if (!dioceseAnalytics || !engagementMetrics) {
      toast({
        title: "No Data",
        description: "Please wait for data to load before exporting",
        variant: "destructive"
      });
      return;
    }

    try {
      const dioceseName = currentDiocese.charAt(0).toUpperCase() + currentDiocese.slice(1);

      if (reportType === 'church_summary') {
        // Diocese-wide Church Summary Report
        if (format === 'pdf') {
          DioceseReportService.exportDioceseChurchSummary(dioceseName, dioceseAnalytics);
          toast({
            title: "Export Complete",
            description: `${dioceseName} Diocese Church Summary PDF downloaded successfully`
          });
        } else {
          DioceseReportService.exportDioceseChurchSummaryExcel(dioceseName, dioceseAnalytics);
          toast({
            title: "Export Complete",
            description: `${dioceseName} Diocese Church Summary Excel downloaded successfully`
          });
        }
      } else if (reportType === 'engagement_analytics') {
        const analyticsData = {
          visitorLogs: dioceseAnalytics.topChurches.flatMap(church =>
            Array(church.visitorCount).fill({
              id: `${church.id}_visitor`,
              visitDate: new Date(),
              timeOfDay: 'afternoon',
              deviceType: 'mobile',
              userId: ''
            })
          ),
          feedback: dioceseAnalytics.topChurches.flatMap(church =>
            Array(church.feedbackCount).fill({
              id: `${church.id}_feedback`,
              rating: church.avgRating,
              subject: 'General Feedback',
              comment: 'Visitor feedback',
              date: new Date(),
              userName: 'Anonymous',
              status: 'published'
            })
          ),
          stats: {
            totalVisitors: dioceseAnalytics.totalVisitors,
            avgDailyVisitors: Math.round(dioceseAnalytics.totalVisitors / 30),
            avgRating: dioceseAnalytics.avgRating,
            growthRate: 0
          }
        };

        const dateRangeObj = { start: startDate, end: endDate };

        if (format === 'pdf') {
          await PDFExportService.exportAnalyticsReport(
            `${dioceseName} Diocese`,
            analyticsData,
            dateRangeObj
          );
          toast({
            title: "Export Complete",
            description: `${dioceseName} Diocese Analytics PDF downloaded successfully`
          });
        } else {
          // Use diocese-specific engagement export for Excel
          DioceseReportService.exportDioceseEngagementExcel(
            dioceseName,
            dioceseAnalytics,
            dateRangeObj
          );
          toast({
            title: "Export Complete",
            description: `${dioceseName} Diocese Engagement Analytics Excel downloaded successfully`
          });
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render stars for ratings
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
      />
    ));
  };
  
  // Get classification color
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'ICP': return 'bg-green-100 text-green-800';
      case 'NCT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading diocese analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Generate Reports
            </h1>
            <p className="text-muted-foreground">
              {isParishSecretary 
                ? 'Create detailed reports for your parish church'
                : `Create comprehensive diocesan reports for ${currentDiocese} diocese`
              }
            </p>
          </div>
        </div>

        {/* Diocese/Parish Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Church className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {isParishSecretary ? 'Parish Churches' : 'Total Churches'}
                  </p>
                  <p className="text-2xl font-bold">{summaryStats.totalChurches}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Heritage Sites</p>
                  <p className="text-2xl font-bold">{summaryStats.icpCount + summaryStats.nctCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Visitors</p>
                  <p className="text-2xl font-bold">{summaryStats.totalVisitors.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{summaryStats.avgRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Report Tabs - Only 2 Reports for Chancery */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="church_summary" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Church Summary Report
            </TabsTrigger>
            <TabsTrigger value="engagement_analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Engagement & Feedback Analytics Report
            </TabsTrigger>
          </TabsList>

          {/* Church Summary Report Tab */}
          <TabsContent value="church_summary" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Report Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {!isParishSecretary && (
                    <div className="space-y-2">
                      <Label>Parish</Label>
                      <Select value={selectedParish} onValueChange={setSelectedParish}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Parishes</SelectItem>
                          {availableChurches.map((church) => (
                            <SelectItem key={church.id} value={church.id}>
                              {church.municipality}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Classification</Label>
                    <Select value={selectedClassification} onValueChange={setSelectedClassification}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classifications</SelectItem>
                        <SelectItem value="ICP">Important Cultural Property</SelectItem>
                        <SelectItem value="NCT">National Cultural Treasure</SelectItem>
                        <SelectItem value="non-heritage">Non-Heritage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={() => handleExport(exportFormat, 'church_summary')}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Church Summary Cards */}
            {availableChurches.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <Church className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Churches Found</h3>
                  <p className="text-muted-foreground">
                    There are no approved churches in the {currentDiocese} diocese yet.
                    Churches will appear here once they are approved.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {availableChurches
                  .filter(church =>
                    (selectedParish === 'all' || church.id === selectedParish) &&
                    (selectedClassification === 'all' ||
                     (selectedClassification === 'non-heritage' && !['ICP', 'NCT'].includes(church.classification)) ||
                     church.classification === selectedClassification)
                  )
                  .map((church) => (
                <Card key={church.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{church.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <MapPin className="w-4 h-4" />
                          {church.municipality}
                        </CardDescription>
                      </div>
                      <Badge className={getClassificationColor(church.classification)}>
                        {church.classification}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Historical Information */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Founded:</span>
                        <span>{church.foundingYear}</span>
                      </div>
                      
                      {church.founders && Array.isArray(church.founders) && church.founders.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Founders:</span>
                          <p className="text-muted-foreground mt-1">
                            {church.founders.join(', ')}
                          </p>
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="font-medium">Architectural Style:</span>
                        <p className="text-muted-foreground">{church.architecturalStyle}</p>
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-medium">Heritage Status:</span>
                        <p className="text-muted-foreground">{church.heritageStatus}</p>
                      </div>
                    </div>

                    {/* Major Events */}
                    {church.majorEvents && Array.isArray(church.majorEvents) && church.majorEvents.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Major Historical Events:</span>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {church.majorEvents.map((event, index) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {/* Preservation History */}
                    {church.preservationHistory && Array.isArray(church.preservationHistory) && church.preservationHistory.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Preservation History:</span>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {church.preservationHistory.map((event, index) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Current Statistics */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-primary">{church.visitorCount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Visitors</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                          {church.avgRating}
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="text-xs text-muted-foreground">Rating</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-primary">{church.feedbackCount}</div>
                        <div className="text-xs text-muted-foreground">Reviews</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>

          {/* Engagement Analytics Tab */}
          <TabsContent value="engagement_analytics" className="space-y-6">
            {/* Analytics Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Analytics Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : <span>Start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : <span>End date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={() => handleExport(exportFormat, 'engagement_analytics')}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visitor Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Visitor Activity Trends
                </CardTitle>
                <CardDescription>
                  Monthly visitor statistics showing growth and decline patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {engagementMetrics?.visitorTrends && engagementMetrics.visitorTrends.length > 0 ? (
                  <div className="space-y-4">
                    {engagementMetrics.visitorTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{trend.month}</span>
                        <div className="flex items-center gap-3">
                          <Progress value={Math.min((trend.visitors / 30000) * 100, 100)} className="w-32" />
                          <span className="text-sm font-bold w-20 text-right">
                            {trend.visitors.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No visitor data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peak Periods Heat Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Peak Visiting Periods
                </CardTitle>
                <CardDescription>
                  Visitor patterns by time of day (morning, afternoon, evening)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {engagementMetrics?.peakVisitingPeriods && engagementMetrics.peakVisitingPeriods.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {engagementMetrics.peakVisitingPeriods.map((period, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-4 rounded-lg border",
                          period.peak ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{period.period}</h4>
                            <p className="text-sm text-muted-foreground">
                              {period.visitors.toLocaleString()} visitors
                            </p>
                          </div>
                          {period.peak && (
                            <Badge className="bg-red-100 text-red-800">Peak</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No visitor time-of-day data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Rating Distribution
                </CardTitle>
                <CardDescription>
                  Overall star rating patterns across all feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                {engagementMetrics?.ratingDistribution && engagementMetrics.ratingDistribution.some(r => r.count > 0) ? (
                  <div className="space-y-4">
                    {engagementMetrics.ratingDistribution.map((rating) => (
                      <div key={rating.rating} className="flex items-center gap-4">
                        <div className="flex items-center gap-1 w-16">
                          {renderStars(rating.rating)}
                        </div>
                        <Progress value={rating.percentage} className="flex-1" />
                        <div className="text-right min-w-[80px]">
                          <span className="text-sm font-medium">{rating.count}</span>
                          <span className="text-sm text-muted-foreground ml-1">({rating.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No feedback ratings available yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Geographic Heatmap - Most Visited Churches */}
            <HybridHeatmap
              diocese={currentDiocese as 'tagbilaran' | 'talibon'}
              churches={churchSummaryData || []}
            />

            {/* Church Comparison (Chancery Only) */}
            {!isParishSecretary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Comparative Parish Engagement
                  </CardTitle>
                  <CardDescription>
                    Comparison of visitor engagement across all parishes in the diocese
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {availableChurches
                      .sort((a, b) => b.visitorCount - a.visitorCount)
                      .map((church) => (
                      <div key={church.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                          <h4 className="font-medium">{church.name}</h4>
                          <p className="text-sm text-muted-foreground">{church.municipality}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{church.visitorCount.toLocaleString()}</span>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{church.avgRating}</span>
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-muted-foreground">({church.feedbackCount})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
};

export default Reports;
