import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface ChurchInfo {
  churchName: string;
  parishName: string;
  locationDetails: {
    streetAddress: string;
    barangay: string;
    municipality: string;
    province: string;
  };
  historicalDetails: {
    foundingYear: string;
    founders: string;
    architecturalStyle: string;
    historicalBackground: string;
    majorHistoricalEvents: string;
    heritageClassification: string;
    religiousClassification: string;
  };
  currentParishPriest: string;
  massSchedules: Array<{
    day: string;
    time: string;
    endTime?: string;
    language: string;
  }>;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    facebookPage: string;
  };
}

interface AnalyticsData {
  visitorLogs: Array<{
    visitDate: Date;
    timeOfDay: string;
    deviceType: string;
  }>;
  feedback: Array<{
    rating: number;
    comment: string;
    date: Date;
  }>;
  stats: {
    totalVisitors: number;
    avgDailyVisitors: number;
    avgRating: number;
    growthRate: number;
  };
}

export class PDFExportService {
  /**
   * Export Church Summary Report as PDF
   */
  static exportChurchSummary(churchInfo: ChurchInfo): void {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Church Summary Report', 105, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(churchInfo.churchName, 105, yPos, { align: 'center' });

    yPos += 15;

    // Basic Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Basic Information', 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Details']],
      body: [
        ['Church Name', churchInfo.churchName],
        ['Parish Name', churchInfo.parishName || 'N/A'],
        ['Location', `${churchInfo.locationDetails.streetAddress}, ${churchInfo.locationDetails.barangay}`],
        ['Municipality', churchInfo.locationDetails.municipality],
        ['Province', churchInfo.locationDetails.province],
        ['Parish Priest', churchInfo.currentParishPriest || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Historical Information
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Historical Information', 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Details']],
      body: [
        ['Founding Year', churchInfo.historicalDetails.foundingYear || 'N/A'],
        ['Founders', churchInfo.historicalDetails.founders || 'N/A'],
        ['Architectural Style', churchInfo.historicalDetails.architecturalStyle || 'N/A'],
        ['Heritage Classification', churchInfo.historicalDetails.heritageClassification || 'None'],
        ['Religious Classification', churchInfo.historicalDetails.religiousClassification || 'None'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Historical Background
    if (churchInfo.historicalDetails.historicalBackground) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Historical Background', 20, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(
        churchInfo.historicalDetails.historicalBackground,
        170
      );
      doc.text(splitText, 20, yPos);
      yPos += splitText.length * 5 + 10;
    }

    // Mass Schedules
    if (churchInfo.massSchedules && churchInfo.massSchedules.length > 0) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Mass Schedules', 20, yPos);
      yPos += 7;

      autoTable(doc, {
        startY: yPos,
        head: [['Day', 'Time', 'Language']],
        body: churchInfo.massSchedules.map(schedule => [
          schedule.day,
          schedule.endTime ? `${schedule.time} - ${schedule.endTime}` : schedule.time,
          schedule.language,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Contact Information
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Contact Information', 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Details']],
      body: [
        ['Phone', churchInfo.contactInfo.phone || 'N/A'],
        ['Email', churchInfo.contactInfo.email || 'N/A'],
        ['Website', churchInfo.contactInfo.website || 'N/A'],
        ['Facebook Page', churchInfo.contactInfo.facebookPage || 'N/A'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    // Save
    const fileName = `${churchInfo.churchName.replace(/\s+/g, '_')}_Summary_${new Date().getFullYear()}.pdf`;
    doc.save(fileName);
  }

  /**
   * Export Analytics Report with charts as PDF
   */
  static async exportAnalyticsReport(
    churchName: string,
    analyticsData: AnalyticsData,
    dateRange: { start: Date; end: Date }
  ): Promise<void> {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Engagement & Analytics Report', 105, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(churchName, 105, yPos, { align: 'center' });

    yPos += 7;
    doc.setFontSize(10);
    doc.text(
      `Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
      105,
      yPos,
      { align: 'center' }
    );

    yPos += 15;

    // Statistics Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Visitors', analyticsData.stats.totalVisitors.toString()],
        ['Average Daily Visitors', analyticsData.stats.avgDailyVisitors.toFixed(1)],
        ['Average Rating', `${analyticsData.stats.avgRating.toFixed(1)} / 5.0`],
        ['Growth Rate', `${analyticsData.stats.growthRate >= 0 ? '+' : ''}${analyticsData.stats.growthRate.toFixed(1)}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Try to capture charts
    try {
      const chartElements = [
        'visitor-trend-chart',
        'peak-hours-chart',
        'rating-distribution-chart',
      ];

      for (const elementId of chartElements) {
        const element = document.getElementById(elementId);
        if (element) {
          if (yPos > 200) {
            doc.addPage();
            yPos = 20;
          }

          const canvas = await html2canvas(element, {
            scale: 2,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          doc.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        }
      }
    } catch (error) {
      console.error('Error capturing charts:', error);
    }

    // Visitor Breakdown by Time of Day
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Visitor Breakdown by Time of Day', 20, yPos);
    yPos += 7;

    const timeBreakdown = analyticsData.visitorLogs.reduce(
      (acc, log) => {
        acc[log.timeOfDay] = (acc[log.timeOfDay] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    autoTable(doc, {
      startY: yPos,
      head: [['Time of Day', 'Visitor Count', 'Percentage']],
      body: Object.entries(timeBreakdown).map(([time, count]) => [
        time.charAt(0).toUpperCase() + time.slice(1),
        count.toString(),
        `${((count / analyticsData.visitorLogs.length) * 100).toFixed(1)}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    // Save
    const fileName = `${churchName.replace(/\s+/g, '_')}_Analytics_${new Date().getFullYear()}.pdf`;
    doc.save(fileName);
  }
}