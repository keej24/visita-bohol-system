import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface ChurchInfo {
  churchName: string;
  parishName: string;
  diocese?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
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
    architecturalFeatures?: string;
    heritageInformation?: string;
  };
  currentParishPriest: string;
  massSchedules: Array<{
    day: string;
    time: string;
    endTime?: string;
    language: string;
    isFbLive?: boolean;
  }>;
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
    facebookPage?: string;
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
   * Helper method to check if we need a new page
   */
  private static checkPageBreak(doc: jsPDF, currentY: number, requiredSpace: number = 40): number {
    if (currentY > 270 - requiredSpace) {
      doc.addPage();
      return 20;
    }
    return currentY;
  }

  /**
   * Helper method to add a section header
   */
  private static addSectionHeader(
    doc: jsPDF,
    title: string,
    yPos: number,
    fontSize: number = 14,
    color: [number, number, number] = [59, 130, 246]
  ): number {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(title, 20, yPos);
    doc.setTextColor(0, 0, 0);
    return yPos + 7;
  }

  /**
   * Helper method to add a subsection header
   */
  private static addSubsectionHeader(doc: jsPDF, title: string, yPos: number): number {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(title, 20, yPos);
    doc.setTextColor(0, 0, 0);
    return yPos + 6;
  }

  /**
   * Helper method to add a text block with proper wrapping
   */
  private static addTextBlock(
    doc: jsPDF,
    text: string,
    yPos: number,
    maxWidth: number = 170,
    fontSize: number = 10
  ): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const splitText = doc.splitTextToSize(text || 'Not documented', maxWidth);
    doc.text(splitText, 20, yPos);
    return yPos + (splitText.length * 5) + 5;
  }

  /**
   * Format time for display
   */
  private static formatTime(time: string): string {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return time;

      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const displayMinutes = minutes.toString().padStart(2, '0');

      if (hours === 12 && minutes === 0) return '12:00 NN';
      return `${displayHours}:${displayMinutes} ${period}`;
    } catch {
      return time;
    }
  }

  /**
   * Export Church Summary Report as PDF - Comprehensive Implementation
   */
  static exportChurchSummary(churchInfo: ChurchInfo): void {
    const doc = new jsPDF();
    let yPos = 20;

    // ============================
    // 1. COVER PAGE / HEADER
    // ============================
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 50, 'F');

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CHURCH SUMMARY REPORT', 105, 25, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(churchInfo.churchName || churchInfo.parishName, 105, 38, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    yPos = 60;

    // Report Metadata
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Report Type: Official Church Documentation`, 105, yPos, { align: 'center' });
    yPos += 5;
    if (churchInfo.diocese) {
      doc.text(`Diocese of ${churchInfo.diocese.charAt(0).toUpperCase() + churchInfo.diocese.slice(1)}`, 105, yPos, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    yPos = 80;

    // ============================
    // 2. BASIC INFORMATION SECTION
    // ============================
    yPos = this.checkPageBreak(doc, yPos, 60);
    yPos = this.addSectionHeader(doc, '1. BASIC INFORMATION', yPos);

    const basicInfoBody = [
      ['Parish Name', churchInfo.parishName || churchInfo.churchName || 'N/A'],
      ['Street Address', churchInfo.locationDetails?.streetAddress || 'Not specified'],
      ['Barangay', churchInfo.locationDetails?.barangay || 'Not specified'],
      ['Municipality', churchInfo.locationDetails?.municipality || 'Not specified'],
      ['Province', churchInfo.locationDetails?.province || 'Bohol'],
    ];

    if (churchInfo.coordinates) {
      basicInfoBody.push(['Geographic Coordinates', `${churchInfo.coordinates.lat.toFixed(6)}, ${churchInfo.coordinates.lng.toFixed(6)}`]);
    }

    basicInfoBody.push(['Current Parish Priest', churchInfo.currentParishPriest || 'Not specified']);

    if (churchInfo.diocese) {
      basicInfoBody.push(['Diocese', churchInfo.diocese.charAt(0).toUpperCase() + churchInfo.diocese.slice(1)]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Field', 'Details']],
      body: basicInfoBody,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 110 } },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============================
    // 3. CLASSIFICATIONS & STATUS SECTION
    // ============================
    yPos = this.checkPageBreak(doc, yPos, 50);
    yPos = this.addSectionHeader(doc, '2. CLASSIFICATIONS & STATUS', yPos);

    autoTable(doc, {
      startY: yPos,
      head: [['Classification Type', 'Designation']],
      body: [
        ['Heritage Classification', churchInfo.historicalDetails?.heritageClassification || 'None'],
        ['Religious Classification', churchInfo.historicalDetails?.religiousClassification || 'None'],
        ['Founding Year', churchInfo.historicalDetails?.foundingYear || 'Not specified'],
        ['Architectural Style', churchInfo.historicalDetails?.architecturalStyle || 'Not specified'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 }, 1: { cellWidth: 100 } },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============================
    // 4. HISTORICAL INFORMATION SECTION
    // ============================
    yPos = this.checkPageBreak(doc, yPos, 50);
    yPos = this.addSectionHeader(doc, '3. HISTORICAL INFORMATION', yPos);

    // 4.1 Founding Details
    yPos = this.addSubsectionHeader(doc, '3.1 Founding Details', yPos);

    autoTable(doc, {
      startY: yPos,
      body: [
        ['Founding Year', churchInfo.historicalDetails?.foundingYear || 'Not documented'],
        ['Founders', churchInfo.historicalDetails?.founders || 'Not documented'],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: [100, 100, 100] }, 1: { cellWidth: 120 } },
      margin: { left: 25, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // 4.2 Historical Background
    yPos = this.checkPageBreak(doc, yPos, 40);
    yPos = this.addSubsectionHeader(doc, '3.2 Historical Background', yPos);

    yPos = this.addTextBlock(
      doc,
      churchInfo.historicalDetails?.historicalBackground || 'No historical background documented.',
      yPos,
      170,
      10
    );
    yPos += 5;

    // 4.3 Major Historical Events
    if (churchInfo.historicalDetails?.majorHistoricalEvents) {
      yPos = this.checkPageBreak(doc, yPos, 30);
      yPos = this.addSubsectionHeader(doc, '3.3 Major Historical Events', yPos);

      yPos = this.addTextBlock(
        doc,
        churchInfo.historicalDetails.majorHistoricalEvents,
        yPos,
        170,
        10
      );
      yPos += 5;
    }

    // ============================
    // 5. ARCHITECTURAL & HERITAGE INFORMATION SECTION
    // ============================
    yPos = this.checkPageBreak(doc, yPos, 50);
    yPos = this.addSectionHeader(doc, '4. ARCHITECTURAL & HERITAGE INFORMATION', yPos);

    // 5.1 Architectural Style Details
    yPos = this.addSubsectionHeader(doc, '4.1 Architectural Style Details', yPos);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Primary Style: ${churchInfo.historicalDetails?.architecturalStyle || 'Not specified'}`, 25, yPos);
    yPos += 8;

    // 5.2 Architectural Features
    if (churchInfo.historicalDetails?.architecturalFeatures) {
      yPos = this.checkPageBreak(doc, yPos, 35);
      yPos = this.addSubsectionHeader(doc, '4.2 Architectural Features', yPos);

      yPos = this.addTextBlock(
        doc,
        churchInfo.historicalDetails.architecturalFeatures,
        yPos,
        170,
        10
      );
      yPos += 5;
    }

    // 5.3 Heritage Information
    if (churchInfo.historicalDetails?.heritageInformation) {
      yPos = this.checkPageBreak(doc, yPos, 35);
      yPos = this.addSubsectionHeader(doc, '4.3 Heritage Information', yPos);

      yPos = this.addTextBlock(
        doc,
        churchInfo.historicalDetails.heritageInformation,
        yPos,
        170,
        10
      );
      yPos += 5;
    }

    // Heritage Classification Details
    yPos = this.checkPageBreak(doc, yPos, 25);
    yPos = this.addSubsectionHeader(doc, '4.4 Heritage Status', yPos);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Heritage Classification: ${churchInfo.historicalDetails?.heritageClassification || 'None'}`, 25, yPos);
    yPos += 6;
    doc.text(`Religious Classification: ${churchInfo.historicalDetails?.religiousClassification || 'None'}`, 25, yPos);
    yPos += 12;

    // ============================
    // 6. PASTORAL & OPERATIONAL INFORMATION SECTION
    // ============================
    yPos = this.checkPageBreak(doc, yPos, 50);
    yPos = this.addSectionHeader(doc, '5. PASTORAL & OPERATIONAL INFORMATION', yPos);

    // 6.1 Parish Leadership
    yPos = this.addSubsectionHeader(doc, '5.1 Current Parish Leadership', yPos);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Parish Priest: ${churchInfo.currentParishPriest || 'Not specified'}`, 25, yPos);
    yPos += 12;

    // 6.2 Mass Schedules
    if (churchInfo.massSchedules && churchInfo.massSchedules.length > 0) {
      yPos = this.checkPageBreak(doc, yPos, 60);
      yPos = this.addSubsectionHeader(doc, '5.2 Mass Schedules', yPos);

      // Group schedules
      const weekdaySchedules = churchInfo.massSchedules.filter(s =>
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(s.day)
      );
      const saturdaySchedules = churchInfo.massSchedules.filter(s => s.day === 'Saturday');
      const sundaySchedules = churchInfo.massSchedules.filter(s => s.day === 'Sunday');

      // Daily Masses (Monday-Friday)
      if (weekdaySchedules.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Masses (Monday - Friday)', 25, yPos);
        yPos += 6;

        const uniqueWeekday = weekdaySchedules.reduce((unique, schedule) => {
          const key = `${schedule.time}-${schedule.endTime}-${schedule.language}`;
          if (!unique.find(s => `${s.time}-${s.endTime}-${s.language}` === key)) {
            unique.push(schedule);
          }
          return unique;
        }, [] as typeof weekdaySchedules);

        uniqueWeekday.forEach(schedule => {
          doc.setFont('helvetica', 'normal');
          const timeStr = schedule.endTime
            ? `${this.formatTime(schedule.time)} - ${this.formatTime(schedule.endTime)}`
            : this.formatTime(schedule.time);
          const lang = schedule.language !== 'Filipino' ? ` (${schedule.language})` : '';
          const fbLive = schedule.isFbLive ? ' [FB Live]' : '';
          doc.text(`  • ${timeStr}${lang}${fbLive}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Saturday Masses
      if (saturdaySchedules.length > 0) {
        yPos = this.checkPageBreak(doc, yPos, 30);
        doc.setFont('helvetica', 'bold');
        doc.text('Saturday Masses', 25, yPos);
        yPos += 6;

        saturdaySchedules.forEach(schedule => {
          doc.setFont('helvetica', 'normal');
          const timeStr = schedule.endTime
            ? `${this.formatTime(schedule.time)} - ${this.formatTime(schedule.endTime)}`
            : this.formatTime(schedule.time);
          const lang = schedule.language !== 'Filipino' ? ` (${schedule.language})` : '';
          const fbLive = schedule.isFbLive ? ' [FB Live]' : '';
          doc.text(`  • ${timeStr}${lang}${fbLive}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Sunday Masses
      if (sundaySchedules.length > 0) {
        yPos = this.checkPageBreak(doc, yPos, 30);
        doc.setFont('helvetica', 'bold');
        doc.text('Sunday Masses', 25, yPos);
        yPos += 6;

        sundaySchedules.forEach(schedule => {
          doc.setFont('helvetica', 'normal');
          const timeStr = schedule.endTime
            ? `${this.formatTime(schedule.time)} - ${this.formatTime(schedule.endTime)}`
            : this.formatTime(schedule.time);
          const lang = schedule.language !== 'Filipino' ? ` (${schedule.language})` : '';
          const fbLive = schedule.isFbLive ? ' [FB Live]' : '';
          doc.text(`  • ${timeStr}${lang}${fbLive}`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      yPos += 5;
    }

    // 6.3 Contact Information
    yPos = this.checkPageBreak(doc, yPos, 40);
    yPos = this.addSubsectionHeader(doc, '5.3 Contact Information', yPos);

    autoTable(doc, {
      startY: yPos,
      body: [
        ['Phone', churchInfo.contactInfo?.phone || 'Not provided'],
        ['Email', churchInfo.contactInfo?.email || 'Not provided'],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: [100, 100, 100] }, 1: { cellWidth: 120 } },
      margin: { left: 25, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============================
    // 6. APPENDICES & SUPPORTING DOCUMENTATION
    // ============================
    yPos = this.checkPageBreak(doc, yPos, 50);
    yPos = this.addSectionHeader(doc, '6. APPENDICES & SUPPORTING DOCUMENTATION', yPos);

    // Appendix A: Heritage Documents
    yPos = this.addSubsectionHeader(doc, 'Appendix A: Heritage Documents', yPos);

    const hasHeritage = churchInfo.historicalDetails?.heritageClassification &&
                       churchInfo.historicalDetails.heritageClassification !== 'None';

    if (hasHeritage) {
      doc.text(`Heritage documentation available for ${churchInfo.historicalDetails.heritageClassification} classification`, 25, yPos);
    } else {
      doc.text('No heritage documentation required', 25, yPos);
    }
    yPos += 10;

    // Appendix B: Report Metadata
    yPos = this.checkPageBreak(doc, yPos, 30);
    yPos = this.addSubsectionHeader(doc, 'Appendix B: Report Metadata', yPos);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Version: 1.0`, 25, yPos);
    yPos += 5;
    doc.text(`Generated: ${new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 25, yPos);
    yPos += 5;
    doc.text(`System: Visita - Church Documentation System`, 25, yPos);
    yPos += 5;
    doc.text(`Data Source: Parish Dashboard Submission`, 25, yPos);

    doc.setTextColor(0, 0, 0);

    // ============================
    // FOOTER (On Every Page)
    // ============================
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Draw footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 282, 190, 282);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);

      // Left: Church name (abbreviated if needed)
      const churchNameAbbr = churchInfo.churchName.length > 40
        ? churchInfo.churchName.substring(0, 37) + '...'
        : churchInfo.churchName;
      doc.text(churchNameAbbr, 20, 287);

      // Center: Generation date
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        105,
        287,
        { align: 'center' }
      );

      // Right: Page number
      doc.text(`Page ${i} of ${pageCount}`, 190, 287, { align: 'right' });

      doc.setTextColor(0, 0, 0);
    }

    // Save
    const fileName = `${churchInfo.churchName.replace(/\s+/g, '_')}_Church_Summary_${new Date().getFullYear()}.pdf`;
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