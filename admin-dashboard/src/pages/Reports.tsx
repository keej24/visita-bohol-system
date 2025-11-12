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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format as formatDate, subMonths } from 'date-fns';
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
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  const [activeTab, setActiveTab] = useState<string>('church_summary');
  
  // Export confirmation dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ format: string; reportType: string } | null>(null);

  // Real data state
  const [dioceseAnalytics, setDioceseAnalytics] = useState<DioceseAnalytics | null>(null);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics | null>(null);
  const [churchSummaryData, setChurchSummaryData] = useState<ChurchSummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Determine if user is parish secretary (limited to own church) or chancery (diocesan-wide)
  const isParishSecretary = userProfile?.role === 'parish_secretary';
  const currentDiocese = userProfile?.diocese || 'tagbilaran';

  // Date range validation
  const isValidDateRange = useMemo(() => {
    if (!startDate || !endDate) return true; // Allow empty dates
    return startDate <= endDate;
  }, [startDate, endDate]);

  const dateRangeError = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (startDate > endDate) {
      return "Invalid date range: Start date must be before or equal to end date.";
    }
    return null;
  }, [startDate, endDate]);

  // Report type options based on user role
  const reportTypes = [
    { value: "church_summary", label: "Church Summary Report" },
    { value: "engagement_analytics", label: "Engagement & Feedback Analytics Report" }
  ];

  // Load diocese analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!currentDiocese) return;

      // Validate date range before loading data
      if (!isValidDateRange) {
        console.log('❌ Reports: Invalid date range detected, skipping data load');
        toast({
          title: "Invalid Date Range",
          description: dateRangeError || "Please select a valid date range.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log('📊 Reports: Loading analytics for diocese:', currentDiocese);
      setIsLoading(true);
      try {
        const [analytics, engagement, churches] = await Promise.all([
          DioceseAnalyticsService.getDioceseAnalytics(currentDiocese, startDate, endDate),
          DioceseAnalyticsService.getEngagementMetrics(currentDiocese, startDate, endDate),
          DioceseAnalyticsService.getChurchSummaryData(currentDiocese)
        ]);

        console.log('✅ Reports: Analytics loaded:', {
          totalChurches: analytics.totalChurches,
          churchesWithData: churches.length,
          churchesWithCoordinates: churches.filter(c => c.coordinates).length
        });
        
        if (churches.length > 0) {
          console.log('Sample church data for heatmap:', churches[0]);
        }

        setDioceseAnalytics(analytics);
        setEngagementMetrics(engagement);
        setChurchSummaryData(churches);
      } catch (error) {
        console.error('❌ Reports: Error loading analytics:', error);
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
  }, [currentDiocese, startDate, endDate, toast, isValidDateRange, dateRangeError]);

  // Get unique municipalities from church data
  const availableMunicipalities = useMemo(() => {
    if (!churchSummaryData) return [];
    const municipalities = [...new Set(churchSummaryData.map(c => c.municipality))].filter(Boolean);
    return municipalities.sort();
  }, [churchSummaryData]);

  // Get filtered churches data
  const availableChurches = useMemo(() => {
    if (!churchSummaryData) return [];

    if (isParishSecretary && userProfile?.parish) {
      return churchSummaryData.filter(church => church.id === userProfile.parish);
    }

    let filtered = churchSummaryData;

    // Apply municipality filter
    if (selectedMunicipality !== 'all') {
      filtered = filtered.filter(c => c.municipality === selectedMunicipality);
    }

    // Apply classification filter
    if (selectedClassification !== 'all') {
      filtered = filtered.filter(c => c.classification === selectedClassification);
    }

    return filtered;
  }, [churchSummaryData, isParishSecretary, userProfile?.parish, selectedMunicipality, selectedClassification]);

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

  // Show export confirmation dialog
  const handleExportClick = (format: string, reportType: string) => {
    if (!dioceseAnalytics || !engagementMetrics) {
      toast({
        title: "No Data",
        description: "Please wait for data to load before exporting",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog
    setPendingExport({ format, reportType });
    setShowExportDialog(true);
  };

  // Confirm and perform export
  const confirmExport = async () => {
    if (!pendingExport) return;

    const { format, reportType } = pendingExport;

    try {
      const dioceseName = currentDiocese.charAt(0).toUpperCase() + currentDiocese.slice(1);

      if (reportType === 'church_summary') {
        // availableChurches is already filtered by municipality and classification
        // Apply any additional UI-level filters for display
        const filteredChurches = availableChurches.filter(church =>
          (selectedMunicipality === 'all' || church.municipality === selectedMunicipality) &&
          (selectedClassification === 'all' ||
           (selectedClassification === 'non-heritage' && !['ICP', 'NCT'].includes(church.classification)) ||
           church.classification === selectedClassification)
        );

        // Create filtered analytics data with recalculated municipality breakdown
        const churchesByMunicipality: Record<string, number> = {};
        filteredChurches.forEach(church => {
          const municipality = church.municipality || 'Unknown';
          churchesByMunicipality[municipality] = (churchesByMunicipality[municipality] || 0) + 1;
        });

        const icpCount = filteredChurches.filter(c => c.classification === 'ICP').length;
        const nctCount = filteredChurches.filter(c => c.classification === 'NCT').length;
        const nonHeritageCount = filteredChurches.filter(c => !['ICP', 'NCT'].includes(c.classification)).length;

        const filteredAnalytics = {
          ...dioceseAnalytics!,
          totalChurches: filteredChurches.length,
          heritageChurches: icpCount + nctCount, // Recalculate heritage count
          nonHeritageChurches: nonHeritageCount,
          churchesByMunicipality, // Use recalculated municipality breakdown from filtered set
          churchesByClassification: {
            ICP: icpCount,
            NCT: nctCount,
            non_heritage: nonHeritageCount
          },
          topChurches: filteredChurches.slice(0, 10), // Top 10 from filtered set
          totalVisitors: filteredChurches.reduce((sum, c) => sum + c.visitorCount, 0),
          totalFeedback: filteredChurches.reduce((sum, c) => sum + c.feedbackCount, 0),
          avgRating: filteredChurches.length > 0
            ? filteredChurches.reduce((sum, c) => sum + c.avgRating, 0) / filteredChurches.length
            : 0
        };

        // Diocese-wide Church Summary Report
        if (format === 'pdf') {
          DioceseReportService.exportDioceseChurchSummary(dioceseName, filteredAnalytics);
          toast({
            title: "Report successfully exported",
            description: `Church Summary PDF has been downloaded (${filteredChurches.length} churches)`
          });
        } else {
          DioceseReportService.exportDioceseChurchSummaryExcel(dioceseName, filteredAnalytics);
          toast({
            title: "Report successfully exported",
            description: `Church Summary Excel has been downloaded (${filteredChurches.length} churches)`
          });
        }
      } else if (reportType === 'engagement_analytics') {
        // Use already filtered data from date range (startDate, endDate already applied in loadAnalytics)
        // This respects the date range filters selected by the user
        const analyticsData = {
          visitorLogs: dioceseAnalytics!.topChurches.flatMap(church =>
            Array(church.visitorCount).fill({
              id: `${church.id}_visitor`,
              visitDate: new Date(),
              timeOfDay: 'afternoon',
              deviceType: 'mobile',
              userId: ''
            })
          ),
          feedback: dioceseAnalytics!.topChurches.flatMap(church =>
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
            totalVisitors: dioceseAnalytics!.totalVisitors,
            avgDailyVisitors: Math.round(dioceseAnalytics!.totalVisitors / 30),
            avgRating: dioceseAnalytics!.avgRating,
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
            title: "Report successfully exported",
            description: `Engagement Analytics PDF has been downloaded (${formatDate(startDate, 'MMM dd')} - ${formatDate(endDate, 'MMM dd, yyyy')})`
          });
        } else {
          // Use diocese-specific engagement export for Excel
          DioceseReportService.exportDioceseEngagementExcel(
            dioceseName,
            dioceseAnalytics!,
            dateRangeObj
          );
          toast({
            title: "Report successfully exported",
            description: `Engagement Analytics Excel has been downloaded (${formatDate(startDate, 'MMM dd')} - ${formatDate(endDate, 'MMM dd, yyyy')})`
          });
        }
      }

      // Success - close dialog and show confirmation
      setShowExportDialog(false);
      setPendingExport(null);
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
      setShowExportDialog(false);
      setPendingExport(null);
    }
  };

  // Cancel export
  const cancelExport = () => {
    setShowExportDialog(false);
    setPendingExport(null);
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
                      <Label>Municipality</Label>
                      <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Municipalities</SelectItem>
                          {availableMunicipalities.map((municipality) => (
                            <SelectItem key={municipality} value={municipality}>
                              {municipality}
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

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button 
                      onClick={() => handleExportClick(exportFormat, 'church_summary')}
                      className="w-full h-10"
                      disabled={availableChurches.filter(church =>
                        (selectedMunicipality === 'all' || church.municipality === selectedMunicipality) &&
                        (selectedClassification === 'all' ||
                         (selectedClassification === 'non-heritage' && !['ICP', 'NCT'].includes(church.classification)) ||
                         church.classification === selectedClassification)
                      ).length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>

                {/* Export Error Message */}
                {availableChurches.filter(church =>
                  (selectedMunicipality === 'all' || church.municipality === selectedMunicipality) &&
                  (selectedClassification === 'all' ||
                   (selectedClassification === 'non-heritage' && !['ICP', 'NCT'].includes(church.classification)) ||
                   church.classification === selectedClassification)
                ).length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <span className="text-red-600 text-sm font-medium">⚠️ No data to export with current filters</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Church Summary Cards */}
            {availableChurches.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <Church className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedMunicipality !== 'all' || selectedClassification !== 'all' ? (
                      <>
                        No churches match your selected filters. Try adjusting your filter criteria:
                        {selectedMunicipality !== 'all' && <><br />• Municipality: {selectedMunicipality}</>}
                        {selectedClassification !== 'all' && <><br />• Classification: {selectedClassification === 'non-heritage' ? 'Non-Heritage' : selectedClassification}</>}
                      </>
                    ) : (
                      <>
                        There are no approved churches in the {currentDiocese} diocese yet.
                        Churches will appear here once they are approved.
                      </>
                    )}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedMunicipality('all');
                        setSelectedClassification('all');
                      }}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('engagement_analytics')}
                    >
                      View Engagement Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {(() => {
                  const filteredForDisplay = availableChurches.filter(church =>
                    (selectedMunicipality === 'all' || church.municipality === selectedMunicipality) &&
                    (selectedClassification === 'all' ||
                     (selectedClassification === 'non-heritage' && !['ICP', 'NCT'].includes(church.classification)) ||
                     church.classification === selectedClassification)
                  );

                  if (filteredForDisplay.length === 0) {
                    return (
                      <Card className="col-span-full">
                        <CardContent className="p-12 text-center">
                          <Church className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                          <p className="text-muted-foreground mb-4">
                            No churches match your selected filters:
                            {selectedMunicipality !== 'all' && <><br />• Municipality: {selectedMunicipality}</>}
                            {selectedClassification !== 'all' && <><br />• Classification: {selectedClassification === 'non-heritage' ? 'Non-Heritage' : selectedClassification}</>}
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setSelectedMunicipality('all');
                                setSelectedClassification('all');
                              }}
                            >
                              <Filter className="w-4 h-4 mr-2" />
                              Clear Filters
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setActiveTab('engagement_analytics')}
                            >
                              View Engagement Analytics
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredForDisplay.map((church) => (
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
                  );
                })()}
              </>
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
                            !startDate && "text-muted-foreground",
                            !isValidDateRange && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? formatDate(startDate, "PPP") : <span>Start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          disabled={(date) => date > new Date()}
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
                            !endDate && "text-muted-foreground",
                            !isValidDateRange && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? formatDate(endDate, "PPP") : <span>End date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          disabled={(date) => date > new Date() || (startDate ? date < startDate : false)}
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

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button 
                      onClick={() => handleExportClick(exportFormat, 'engagement_analytics')}
                      className="w-full h-10"
                      disabled={!engagementMetrics || !dioceseAnalytics || !isValidDateRange}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Analytics
                    </Button>
                  </div>
                </div>

                {/* Export Error Messages */}
                {(!engagementMetrics || !dioceseAnalytics) && !dateRangeError && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <span className="text-blue-600 text-sm font-medium">ℹ️ Loading data...</span>
                  </div>
                )}

                {/* Date Range Error Message */}
                {dateRangeError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <span className="text-red-600 text-sm font-medium">⚠️ {dateRangeError}</span>
                  </div>
                )}
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

      {/* Export Confirmation Dialog */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Export</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to export the <strong>{pendingExport?.reportType === 'church_summary' ? 'Church Summary' : 'Engagement Analytics'}</strong> report as a <strong>{pendingExport?.format === 'pdf' ? 'PDF document' : 'Excel spreadsheet'}</strong>.
              <br /><br />
              {pendingExport?.reportType === 'church_summary' ? (
                <>
                  <strong>Applied Filters:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {selectedMunicipality !== 'all' && (
                      <li>Municipality: {selectedMunicipality}</li>
                    )}
                    {selectedClassification !== 'all' && (
                      <li>Classification: {selectedClassification === 'non-heritage' ? 'Non-Heritage' : selectedClassification}</li>
                    )}
                    {selectedMunicipality === 'all' && selectedClassification === 'all' && (
                      <li>All churches in {currentDiocese} diocese</li>
                    )}
                  </ul>
                </>
              ) : (
                <>
                  <strong>Date Range:</strong> {formatDate(startDate, 'MMM dd, yyyy')} - {formatDate(endDate, 'MMM dd, yyyy')}
                </>
              )}
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
    </Layout>
  );
};

export default Reports;
