import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import { FileBarChart, Download, Calendar as CalendarIcon, Filter, TrendingUp, Users, Church, Megaphone } from "lucide-react";

const Reports = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reportType, setReportType] = useState<string>();

  const reportTypes = [
    { value: "church_visits", label: "Church Visits Analytics" },
    { value: "announcements", label: "Announcements Performance" },
    { value: "feedback", label: "Feedback Summary" },
    { value: "comprehensive", label: "Comprehensive Overview" }
  ];

  const quickReports = [
    {
      title: "Monthly Church Visits",
      description: "Visitor statistics for all churches this month",
      icon: TrendingUp,
      color: "text-success"
    },
    {
      title: "User Engagement",
      description: "App usage and user interaction metrics",
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Church Performance",
      description: "Individual church performance analysis",
      icon: Church,
      color: "text-accent"
    },
    {
      title: "Announcements Reach",
      description: "Effectiveness of posted announcements",
      icon: Megaphone,
      color: "text-warning"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="heritage-card-accent p-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <FileBarChart className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary mb-1">
                Generate Reports
              </h1>
              <p className="text-muted-foreground">
                Create comprehensive reports and analytics for church management
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Report Generation Form */}
          <div className="xl:col-span-2 space-y-6">
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Custom Report Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Report Type Selection */}
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="pointer-events-auto"
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
                          {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Additional Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="church-filter">Specific Church (Optional)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All churches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Churches</SelectItem>
                        <SelectItem value="baclayon">Baclayon Church</SelectItem>
                        <SelectItem value="loboc">Loboc Church</SelectItem>
                        <SelectItem value="dauis">Dauis Church</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Export Format</Label>
                    <Select defaultValue="pdf">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="heritage" 
                    size="lg" 
                    className="flex-1"
                    disabled={!reportType || !startDate || !endDate}
                  >
                    <FileBarChart className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline" size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Reports */}
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">Recent Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Monthly Church Visits - December 2024", date: "2024-01-15", format: "PDF", size: "2.3 MB" },
                    { name: "Announcements Performance - Q4 2024", date: "2024-01-12", format: "Excel", size: "1.8 MB" },
                    { name: "Comprehensive Overview - 2024", date: "2024-01-10", format: "PDF", size: "4.7 MB" },
                    { name: "Feedback Summary - December 2024", date: "2024-01-08", format: "CSV", size: "0.9 MB" }
                  ].map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{report.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{report.date}</span>
                          <span>{report.format}</span>
                          <span>{report.size}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Reports Sidebar */}
          <div className="space-y-6">
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">Quick Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickReports.map((report, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center`}>
                        <report.icon className={`w-4 h-4 ${report.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm">{report.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                        <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-primary">
                          Generate Now →
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Report Statistics */}
            <Card className="heritage-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-primary">Report Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="stats-value">47</div>
                  <div className="stats-label">Reports Generated This Month</div>
                </div>
                <div className="text-center">
                  <div className="stats-value">156</div>
                  <div className="stats-label">Total Reports</div>
                </div>
                <div className="text-center">
                  <div className="stats-value">98.5%</div>
                  <div className="stats-label">Report Success Rate</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;