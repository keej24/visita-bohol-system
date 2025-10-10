import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { DioceseAnalytics, ChurchSummaryData } from './dioceseAnalyticsService';

export class DioceseReportService {
  /**
   * Export Diocese-wide Church Summary Report as PDF
   * Consolidates all municipalities with their churches
   */
  static exportDioceseChurchSummary(
    dioceseName: string,
    analytics: DioceseAnalytics
  ): void {
    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dioceseName} Diocese`, 105, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(16);
    doc.text('Church Summary Report', 105, yPos, { align: 'center' });
    yPos += 15;

    // Summary Statistics
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Diocese Overview', 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Count']],
      body: [
        ['Total Churches', analytics.totalChurches.toString()],
        ['National Cultural Treasures (NCT)', analytics.churchesByClassification.NCT.toString()],
        ['Important Cultural Properties (ICP)', analytics.churchesByClassification.ICP.toString()],
        ['Non-Heritage Churches', analytics.nonHeritageChurches.toString()],
        ['Total Visitors', analytics.totalVisitors.toLocaleString()],
        ['Average Rating', `${analytics.avgRating} / 5.0`],
        ['Total Feedback', analytics.totalFeedback.toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Churches by Municipality
    if (yPos > 230) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Churches by Municipality', 20, yPos);
    yPos += 7;

    const municipalityData = Object.entries(analytics.churchesByMunicipality)
      .sort(([, a], [, b]) => b - a)
      .map(([municipality, count]) => [
        municipality,
        count.toString(),
        `${Math.round((count / analytics.totalChurches) * 100)}%`
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Municipality', 'Number of Churches', 'Percentage']],
      body: municipalityData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Top Churches
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 10 Churches by Visitor Count', 20, yPos);
    yPos += 7;

    const topChurchesData = analytics.topChurches.slice(0, 10).map((church, index) => [
      (index + 1).toString(),
      church.name,
      church.municipality,
      church.foundingYear.toString(),
      church.classification,
      church.visitorCount.toLocaleString(),
      church.avgRating.toString(),
      church.feedbackCount.toString()
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Church Name', 'Municipality', 'Founded', 'Class.', 'Visitors', 'Rating', 'Feedback']],
      body: topChurchesData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 18 },
        4: { cellWidth: 15 },
        5: { cellWidth: 20 },
        6: { cellWidth: 15 },
        7: { cellWidth: 18 }
      },
      margin: { left: 20, right: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // All Churches List
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Complete Church Directory', 20, yPos);
    yPos += 10;

    const allChurchesData = analytics.topChurches.map((church, index) => [
      (index + 1).toString(),
      church.name,
      church.municipality,
      church.foundingYear.toString(),
      church.classification,
      church.status
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Church Name', 'Municipality', 'Founded', 'Classification', 'Status']],
      body: allChurchesData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 }
      },
      margin: { left: 20, right: 20 },
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${dioceseName} Diocese Church Summary | Generated ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    // Save
    const fileName = `${dioceseName}_Diocese_Church_Summary_${new Date().getFullYear()}.pdf`;
    doc.save(fileName);
  }

  /**
   * Export Diocese-wide Church Summary as Excel
   * Multiple sheets with complete data
   */
  static exportDioceseChurchSummaryExcel(
    dioceseName: string,
    analytics: DioceseAnalytics
  ): void {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Diocese Overview
    const overviewData = [
      ['Diocese Church Summary Report'],
      ['Diocese:', dioceseName],
      ['Generated:', new Date().toLocaleDateString()],
      [],
      ['Diocese Statistics'],
      ['Metric', 'Value'],
      ['Total Churches', analytics.totalChurches],
      ['Heritage Churches (NCT + ICP)', analytics.heritageChurches],
      ['- National Cultural Treasures', analytics.churchesByClassification.NCT],
      ['- Important Cultural Properties', analytics.churchesByClassification.ICP],
      ['Non-Heritage Churches', analytics.nonHeritageChurches],
      ['Total Visitors', analytics.totalVisitors],
      ['Total Feedback', analytics.totalFeedback],
      ['Average Rating', analytics.avgRating]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    overviewSheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Sheet 2: Churches by Municipality
    const municipalityData = Object.entries(analytics.churchesByMunicipality)
      .sort(([, a], [, b]) => b - a)
      .map(([municipality, count]) => ({
        'Municipality': municipality,
        'Number of Churches': count,
        'Percentage of Total': `${Math.round((count / analytics.totalChurches) * 100)}%`
      }));

    const municipalitySheet = XLSX.utils.json_to_sheet(municipalityData);
    municipalitySheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, municipalitySheet, 'By Municipality');

    // Sheet 3: All Churches Directory
    const allChurchesData = analytics.topChurches.map((church, index) => ({
      '#': index + 1,
      'Church Name': church.name,
      'Municipality': church.municipality,
      'Founding Year': church.foundingYear,
      'Classification': church.classification,
      'Visitors': church.visitorCount,
      'Avg Rating': church.avgRating,
      'Feedback Count': church.feedbackCount,
      'Status': church.status
    }));

    const churchesSheet = XLSX.utils.json_to_sheet(allChurchesData);
    churchesSheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 40 }, // Church Name
      { wch: 20 }, // Municipality
      { wch: 14 }, // Founding Year
      { wch: 16 }, // Classification
      { wch: 12 }, // Visitors
      { wch: 12 }, // Avg Rating
      { wch: 14 }, // Feedback Count
      { wch: 12 }  // Status
    ];
    XLSX.utils.book_append_sheet(workbook, churchesSheet, 'All Churches');

    // Sheet 4: Heritage Churches Detail
    const heritageChurches = analytics.topChurches
      .filter(c => c.classification === 'NCT' || c.classification === 'ICP')
      .map((church, index) => ({
        '#': index + 1,
        'Church Name': church.name,
        'Municipality': church.municipality,
        'Founding Year': church.foundingYear,
        'Classification': church.classification,
        'Visitors': church.visitorCount,
        'Avg Rating': church.avgRating
      }));

    if (heritageChurches.length > 0) {
      const heritageSheet = XLSX.utils.json_to_sheet(heritageChurches);
      heritageSheet['!cols'] = [
        { wch: 5 },  // #
        { wch: 40 }, // Church Name
        { wch: 20 }, // Municipality
        { wch: 14 }, // Founding Year
        { wch: 16 }, // Classification
        { wch: 12 }, // Visitors
        { wch: 12 }  // Avg Rating
      ];
      XLSX.utils.book_append_sheet(workbook, heritageSheet, 'Heritage Churches');
    }

    // Sheet 5: Classification Summary
    const classificationData = [
      {
        'Classification': 'National Cultural Treasures (NCT)',
        'Count': analytics.churchesByClassification.NCT,
        'Percentage': `${Math.round((analytics.churchesByClassification.NCT / analytics.totalChurches) * 100)}%`
      },
      {
        'Classification': 'Important Cultural Properties (ICP)',
        'Count': analytics.churchesByClassification.ICP,
        'Percentage': `${Math.round((analytics.churchesByClassification.ICP / analytics.totalChurches) * 100)}%`
      },
      {
        'Classification': 'Non-Heritage',
        'Count': analytics.nonHeritageChurches,
        'Percentage': `${Math.round((analytics.nonHeritageChurches / analytics.totalChurches) * 100)}%`
      }
    ];

    const classificationSheet = XLSX.utils.json_to_sheet(classificationData);
    classificationSheet['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, classificationSheet, 'By Classification');

    // Save
    const fileName = `${dioceseName}_Diocese_Church_Summary_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Export Diocese-wide Engagement Analytics as Excel
   */
  static exportDioceseEngagementExcel(
    dioceseName: string,
    analytics: DioceseAnalytics,
    dateRange: { start: Date; end: Date }
  ): void {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary Statistics
    const summaryData = [
      ['Engagement & Feedback Analytics Report'],
      ['Diocese:', dioceseName],
      ['Period:', `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`],
      ['Generated:', new Date().toLocaleDateString()],
      [],
      ['Summary Statistics'],
      ['Metric', 'Value'],
      ['Total Visitors', analytics.totalVisitors],
      ['Average Daily Visitors', Math.round(analytics.totalVisitors / 30)],
      ['Total Feedback', analytics.totalFeedback],
      ['Average Rating', `${analytics.avgRating} / 5.0`],
      ['Total Churches', analytics.totalChurches],
      ['Active Parishes', analytics.recentActivity.activeParishes]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: Top Churches by Engagement
    const topChurchesData = analytics.topChurches.slice(0, 20).map((church, index) => ({
      'Rank': index + 1,
      'Church Name': church.name,
      'Municipality': church.municipality,
      'Classification': church.classification,
      'Total Visitors': church.visitorCount,
      'Feedback Count': church.feedbackCount,
      'Average Rating': church.avgRating
    }));

    const topChurchesSheet = XLSX.utils.json_to_sheet(topChurchesData);
    topChurchesSheet['!cols'] = [
      { wch: 8 },  // Rank
      { wch: 40 }, // Church Name
      { wch: 20 }, // Municipality
      { wch: 16 }, // Classification
      { wch: 14 }, // Visitors
      { wch: 14 }, // Feedback
      { wch: 14 }  // Rating
    ];
    XLSX.utils.book_append_sheet(workbook, topChurchesSheet, 'Top Churches');

    // Sheet 3: Monthly Visitor Trends
    const trendsData = analytics.visitorsByMonth.map(trend => ({
      'Month': trend.month,
      'Visitors': trend.visitors
    }));

    const trendsSheet = XLSX.utils.json_to_sheet(trendsData);
    trendsSheet['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Visitor Trends');

    // Sheet 4: Engagement by Municipality
    const municipalityEngagement = Object.entries(analytics.churchesByMunicipality)
      .map(([municipality, count]) => {
        const municipalityChurches = analytics.topChurches.filter(c => c.municipality === municipality);
        const totalVisitors = municipalityChurches.reduce((sum, c) => sum + c.visitorCount, 0);
        const totalFeedback = municipalityChurches.reduce((sum, c) => sum + c.feedbackCount, 0);
        const avgRating = municipalityChurches.length > 0
          ? municipalityChurches.reduce((sum, c) => sum + c.avgRating, 0) / municipalityChurches.length
          : 0;

        return {
          'Municipality': municipality,
          'Churches': count,
          'Total Visitors': totalVisitors,
          'Total Feedback': totalFeedback,
          'Average Rating': Math.round(avgRating * 10) / 10
        };
      })
      .sort((a, b) => b['Total Visitors'] - a['Total Visitors']);

    const municipalitySheet = XLSX.utils.json_to_sheet(municipalityEngagement);
    municipalitySheet['!cols'] = [
      { wch: 25 }, // Municipality
      { wch: 12 }, // Churches
      { wch: 15 }, // Visitors
      { wch: 15 }, // Feedback
      { wch: 14 }  // Rating
    ];
    XLSX.utils.book_append_sheet(workbook, municipalitySheet, 'By Municipality');

    // Save
    const fileName = `${dioceseName}_Diocese_Engagement_Analytics_${new Date().getFullYear()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}

