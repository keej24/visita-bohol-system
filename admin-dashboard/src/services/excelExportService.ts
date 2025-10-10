import * as XLSX from 'xlsx';

interface AnalyticsData {
  visitorLogs: Array<{
    id: string;
    visitDate: Date;
    timeOfDay: string;
    deviceType: string;
    userId?: string;
  }>;
  feedback: Array<{
    id: string;
    rating: number;
    subject: string;
    comment: string;
    date: Date;
    userName?: string;
    status: string;
  }>;
  stats: {
    totalVisitors: number;
    avgDailyVisitors: number;
    avgRating: number;
    growthRate: number;
  };
}

export class ExcelExportService {
  /**
   * Export Analytics Report as Excel file with multiple sheets
   */
  static exportAnalyticsReport(
    churchName: string,
    analyticsData: AnalyticsData,
    dateRange: { start: Date; end: Date }
  ): void {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary Statistics
    const summaryData = [
      ['Engagement & Analytics Report'],
      ['Church:', churchName],
      ['Period:', `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`],
      ['Generated:', new Date().toLocaleDateString()],
      [],
      ['Summary Statistics'],
      ['Metric', 'Value'],
      ['Total Visitors', analyticsData.stats.totalVisitors],
      ['Average Daily Visitors', parseFloat(analyticsData.stats.avgDailyVisitors.toFixed(2))],
      ['Average Rating', `${analyticsData.stats.avgRating.toFixed(2)} / 5.0`],
      ['Growth Rate', `${analyticsData.stats.growthRate >= 0 ? '+' : ''}${analyticsData.stats.growthRate.toFixed(2)}%`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths for summary sheet
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: Visitor Logs
    if (analyticsData.visitorLogs.length > 0) {
      const visitorData = analyticsData.visitorLogs.map(log => ({
        'Visit Date': log.visitDate.toLocaleDateString(),
        'Visit Time': log.visitDate.toLocaleTimeString(),
        'Time of Day': log.timeOfDay.charAt(0).toUpperCase() + log.timeOfDay.slice(1),
        'Device Type': log.deviceType,
        'Visitor ID': log.userId || 'Anonymous',
      }));

      const visitorSheet = XLSX.utils.json_to_sheet(visitorData);

      // Set column widths
      visitorSheet['!cols'] = [
        { wch: 15 }, // Visit Date
        { wch: 12 }, // Visit Time
        { wch: 12 }, // Time of Day
        { wch: 12 }, // Device Type
        { wch: 25 }, // Visitor ID
      ];

      XLSX.utils.book_append_sheet(workbook, visitorSheet, 'Visitor Logs');

      // Sheet 3: Visitor Breakdown
      const timeBreakdown = analyticsData.visitorLogs.reduce(
        (acc, log) => {
          acc[log.timeOfDay] = (acc[log.timeOfDay] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const breakdownData = Object.entries(timeBreakdown).map(([time, count]) => ({
        'Time of Day': time.charAt(0).toUpperCase() + time.slice(1),
        'Visitor Count': count,
        'Percentage': `${((count / analyticsData.visitorLogs.length) * 100).toFixed(2)}%`,
      }));

      const breakdownSheet = XLSX.utils.json_to_sheet(breakdownData);
      breakdownSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }];

      XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Visitor Breakdown');
    }

    // Sheet 4: Feedback Data
    if (analyticsData.feedback.length > 0) {
      const feedbackData = analyticsData.feedback.map(feedback => ({
        'Date': feedback.date.toLocaleDateString(),
        'User': feedback.userName || 'Anonymous',
        'Rating': `${feedback.rating} / 5`,
        'Subject': feedback.subject,
        'Comment': feedback.comment,
        'Status': feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1),
      }));

      const feedbackSheet = XLSX.utils.json_to_sheet(feedbackData);

      // Set column widths
      feedbackSheet['!cols'] = [
        { wch: 12 }, // Date
        { wch: 15 }, // User
        { wch: 8 },  // Rating
        { wch: 25 }, // Subject
        { wch: 50 }, // Comment
        { wch: 12 }, // Status
      ];

      XLSX.utils.book_append_sheet(workbook, feedbackSheet, 'Feedback');

      // Sheet 5: Rating Distribution
      const ratingDistribution = analyticsData.feedback.reduce(
        (acc, feedback) => {
          acc[feedback.rating] = (acc[feedback.rating] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>
      );

      const ratingData = [1, 2, 3, 4, 5].map(rating => ({
        'Rating': `${rating} Star${rating > 1 ? 's' : ''}`,
        'Count': ratingDistribution[rating] || 0,
        'Percentage': analyticsData.feedback.length > 0
          ? `${(((ratingDistribution[rating] || 0) / analyticsData.feedback.length) * 100).toFixed(2)}%`
          : '0%',
      }));

      const ratingSheet = XLSX.utils.json_to_sheet(ratingData);
      ratingSheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }];

      XLSX.utils.book_append_sheet(workbook, ratingSheet, 'Rating Distribution');
    }

    // Save the workbook
    const fileName = `${churchName.replace(/\s+/g, '_')}_Analytics_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Export simple visitor list as Excel
   */
  static exportVisitorList(
    churchName: string,
    visitorLogs: Array<{
      visitDate: Date;
      timeOfDay: string;
      deviceType: string;
    }>
  ): void {
    const data = visitorLogs.map((log, index) => ({
      '#': index + 1,
      'Visit Date': log.visitDate.toLocaleDateString(),
      'Visit Time': log.visitDate.toLocaleTimeString(),
      'Time of Day': log.timeOfDay.charAt(0).toUpperCase() + log.timeOfDay.slice(1),
      'Device': log.deviceType,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 12 }, // Visit Date
      { wch: 12 }, // Visit Time
      { wch: 12 }, // Time of Day
      { wch: 10 }, // Device
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitor List');

    const fileName = `${churchName.replace(/\s+/g, '_')}_Visitors_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Export feedback list as Excel
   */
  static exportFeedbackList(
    churchName: string,
    feedback: Array<{
      date: Date;
      userName?: string;
      rating: number;
      subject: string;
      comment: string;
      status: string;
    }>
  ): void {
    const data = feedback.map((item, index) => ({
      '#': index + 1,
      'Date': item.date.toLocaleDateString(),
      'User': item.userName || 'Anonymous',
      'Rating': `${item.rating}/5`,
      'Subject': item.subject,
      'Comment': item.comment,
      'Status': item.status.charAt(0).toUpperCase() + item.status.slice(1),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 12 }, // Date
      { wch: 15 }, // User
      { wch: 8 },  // Rating
      { wch: 25 }, // Subject
      { wch: 50 }, // Comment
      { wch: 12 }, // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Feedback');

    const fileName = `${churchName.replace(/\s+/g, '_')}_Feedback_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}
