import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { DioceseAnalytics, ChurchSummaryData } from './dioceseAnalyticsService';

// Helper function to safely convert field to array
const toArray = (value: string | string[] | undefined | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

export class DioceseReportService {
  /**
   * Export Diocese-wide Church Summary Report as PDF
   * Consolidates all municipalities with their churches
   * Adapts layout based on whether it's a single church or multiple churches
   */
  static exportDioceseChurchSummary(
    dioceseName: string,
    analytics: DioceseAnalytics
  ): void {
    const doc = new jsPDF();
    let yPos = 20;
    
    const isSingleChurch = analytics.totalChurches === 1;
    const singleChurch = isSingleChurch ? analytics.topChurches[0] : null;

    // ============================
    // COVER HEADER WITH BRANDING
    // ============================
    // Sidebar color: HSL(220, 72%, 24%) = RGB(17, 40, 110) - Deep Ecclesiastical Blue
    doc.setFillColor(17, 40, 110);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Diocese of ${dioceseName}`, 105, 18, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    if (isSingleChurch && singleChurch) {
      doc.text('PARISH SUMMARY REPORT', 105, 28, { align: 'center' });
      doc.setFontSize(12);
      doc.text(singleChurch.name, 105, 38, { align: 'center' });
    } else {
      doc.text('CHURCH SUMMARY REPORT', 105, 28, { align: 'center' });
      doc.setFontSize(11);
      doc.text(`Total: ${analytics.totalChurches} Churches`, 105, 38, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    yPos = 55;

    // Report metadata
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 20, yPos);
    doc.text('VISITA Bohol Churches Information System', 190, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // For single church, show detailed church info first
    if (isSingleChurch && singleChurch) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Parish Information', 20, yPos);
      yPos += 7;

      const churchInfoRows: [string, string][] = [
        ['Parish Name', singleChurch.name],
        ['Municipality', singleChurch.municipality],
        ['Founding Year', singleChurch.foundingYear.toString()],
        ['Classification', singleChurch.classification === 'ICP' ? 'Important Cultural Property (ICP)' : 
                          singleChurch.classification === 'NCT' ? 'National Cultural Treasure (NCT)' : 'Non-Heritage'],
        ['Total Visitors', singleChurch.visitorCount.toLocaleString()],
        ['Average Rating', `${singleChurch.avgRating.toFixed(1)} / 5.0`],
        ['Total Feedback', singleChurch.feedbackCount.toString()]
      ];

      // Add architectural style if available
      if (singleChurch.architecturalStyle) {
        churchInfoRows.push(['Architectural Style', singleChurch.architecturalStyle]);
      }

      autoTable(doc, {
        startY: yPos,
        head: [['Detail', 'Information']],
        body: churchInfoRows,
        theme: 'grid',
        headStyles: { fillColor: [17, 40, 110] },
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Helper function to check and add page break if needed
      const checkPageBreak = (requiredSpace: number = 30) => {
        const pageHeight = doc.internal.pageSize.height;
        if (yPos + requiredSpace > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Historical Details for single church
      const founders = toArray(singleChurch.founders);
      const majorEvents = toArray(singleChurch.majorEvents);
      const heritageInfo = singleChurch.heritageInformation || '';
      const architecturalFeatures = singleChurch.architecturalFeatures || '';
      const historicalBackground = singleChurch.historicalBackground || '';
      
      // Historical Background Section
      if (founders.length > 0 || majorEvents.length > 0 || historicalBackground) {
        checkPageBreak(50);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Historical Background', 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        if (founders.length > 0) {
          checkPageBreak(15);
          doc.setFont('helvetica', 'bold');
          doc.text('Founders:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 5;
          const foundersText = doc.splitTextToSize(founders.join(', '), 165);
          doc.text(foundersText, 25, yPos);
          yPos += foundersText.length * 5 + 8;
        }

        // Historical Background narrative text
        if (historicalBackground) {
          checkPageBreak(20);
          doc.setFont('helvetica', 'bold');
          doc.text('Background:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 5;
          
          const bgLines = doc.splitTextToSize(historicalBackground, 165);
          const lineHeight = 5;
          bgLines.forEach((line: string) => {
            checkPageBreak(lineHeight + 2);
            doc.text(line, 25, yPos);
            yPos += lineHeight;
          });
          yPos += 8;
        }

        if (majorEvents.length > 0) {
          checkPageBreak(20);
          doc.setFont('helvetica', 'bold');
          doc.text('Major Historical Events:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 5;
          majorEvents.forEach(event => {
            checkPageBreak(15);
            const lines = doc.splitTextToSize(`• ${event}`, 165);
            doc.text(lines, 25, yPos);
            yPos += lines.length * 5 + 2;
          });
          yPos += 5;
        }
      }

      // Architectural & Heritage Information Section
      if (architecturalFeatures || heritageInfo) {
        checkPageBreak(50);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Architectural & Heritage Information', 20, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        if (architecturalFeatures) {
          checkPageBreak(20);
          doc.setFont('helvetica', 'bold');
          doc.text('Architectural Features:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 5;
          
          // Split architectural features into lines and handle page breaks
          const archLines = doc.splitTextToSize(architecturalFeatures, 165);
          const lineHeight = 5;
          archLines.forEach((line: string) => {
            checkPageBreak(lineHeight + 2);
            doc.text(line, 25, yPos);
            yPos += lineHeight;
          });
          yPos += 8;
        }

        if (heritageInfo) {
          checkPageBreak(20);
          doc.setFont('helvetica', 'bold');
          doc.text('Heritage Information:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 5;
          
          // Split heritage info into lines and handle page breaks for long content
          const heritageLines = doc.splitTextToSize(heritageInfo, 165);
          const lineHeight = 5;
          heritageLines.forEach((line: string) => {
            checkPageBreak(lineHeight + 2);
            doc.text(line, 25, yPos);
            yPos += lineHeight;
          });
          yPos += 5;
        }
      }

    } else {
      // ============================
      // DIOCESE OVERVIEW SECTION
      // ============================
      // Multiple churches - show diocese overview
      
      // Draw section header with colored background
      doc.setFillColor(219, 234, 254); // Light blue background to match sidebar
      doc.rect(15, yPos - 5, 180, 12, 'F');
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 40, 110);
      doc.text('DIOCESE OVERVIEW', 20, yPos + 3);
      doc.setTextColor(0, 0, 0);
      yPos += 15;

      // Build statistics rows dynamically based on filtered data
      const statsRows: [string, string][] = [
        ['Total Churches', analytics.totalChurches.toString()]
      ];

      // Only show classification breakdowns if they have churches
      if (analytics.churchesByClassification.NCT > 0) {
        statsRows.push(['National Cultural Treasures (NCT)', analytics.churchesByClassification.NCT.toString()]);
      }
      if (analytics.churchesByClassification.ICP > 0) {
        statsRows.push(['Important Cultural Properties (ICP)', analytics.churchesByClassification.ICP.toString()]);
      }
      if (analytics.nonHeritageChurches > 0) {
        statsRows.push(['Non-Heritage Churches', analytics.nonHeritageChurches.toString()]);
      }

      // Always show visitor statistics
      statsRows.push(
        ['Total Visitors', analytics.totalVisitors.toLocaleString()],
        ['Average Rating', `${analytics.avgRating.toFixed(1)} / 5.0`],
        ['Total Feedback', analytics.totalFeedback.toLocaleString()]
      );

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Count']],
        body: statsRows,
        theme: 'grid',
        headStyles: { fillColor: [17, 40, 110] },
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Churches by Municipality - only show if more than 1 municipality
      const municipalityCount = Object.keys(analytics.churchesByMunicipality).length;
      if (municipalityCount > 1) {
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
          headStyles: { fillColor: [17, 40, 110] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Top Churches - only show if more than 1 church
      if (analytics.topChurches.length > 1) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const topCount = Math.min(analytics.topChurches.length, 10);
        doc.text(`Top ${topCount} Churches by Visitor Count`, 20, yPos);
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
          headStyles: { fillColor: [17, 40, 110], fontSize: 9 },
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
      }

      // Complete Church Directory - only if more than 1 church
      if (analytics.topChurches.length > 1) {
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
          headStyles: { fillColor: [17, 40, 110], fontSize: 10 },
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
      }

      // Architectural & Heritage Information Section - only for multiple churches
      if (analytics.topChurches.length > 1) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Architectural & Heritage Information', 20, yPos);
        yPos += 10;

        // Filter churches that have historical/heritage data
        const churchesWithHistory = analytics.topChurches.filter(
          church => (toArray(church.founders).length > 0) ||
                    (toArray(church.majorEvents).length > 0) ||
                    church.architecturalStyle ||
                    church.architecturalFeatures ||
                    church.heritageInformation
        );

        if (churchesWithHistory.length > 0) {
          churchesWithHistory.forEach((church, index) => {
            // Check if we need a new page
            if (yPos > 240) {
              doc.addPage();
              yPos = 20;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}. ${church.name}`, 20, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');

            // Architectural Style
            if (church.architecturalStyle) {
              doc.text(`Architectural Style: ${church.architecturalStyle}`, 25, yPos);
              yPos += 5;
            }

            // Architectural Features
            if (church.architecturalFeatures) {
              doc.text('Architectural Features:', 25, yPos);
              yPos += 4;
              const truncatedFeatures = church.architecturalFeatures.length > 150 
                ? church.architecturalFeatures.substring(0, 147) + '...' 
                : church.architecturalFeatures;
              const lines = doc.splitTextToSize(truncatedFeatures, 155);
              doc.text(lines, 28, yPos);
              yPos += lines.length * 4 + 2;
            }

            // Founders
            const founders = toArray(church.founders);
            if (founders.length > 0) {
              doc.text(`Founders: ${founders.join(', ')}`, 25, yPos);
              yPos += 5;
            }

            // Major Events
            const majorEvents = toArray(church.majorEvents);
            if (majorEvents.length > 0) {
              doc.text('Major Events:', 25, yPos);
              yPos += 4;
              majorEvents.slice(0, 3).forEach(event => {
                const truncatedEvent = event.length > 80 ? event.substring(0, 77) + '...' : event;
                doc.text(`  • ${truncatedEvent}`, 28, yPos);
                yPos += 4;
              });
            }

            // Heritage Information (replaces Preservation History)
            if (church.heritageInformation) {
              doc.text('Heritage Information:', 25, yPos);
              yPos += 4;
              const truncatedInfo = church.heritageInformation.length > 150 
                ? church.heritageInformation.substring(0, 147) + '...' 
                : church.heritageInformation;
              const lines = doc.splitTextToSize(truncatedInfo, 155);
              doc.text(lines, 28, yPos);
              yPos += lines.length * 4 + 2;
            }

            yPos += 6; // Space between churches
          });
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.text('No historical details available for the selected churches.', 20, yPos);
        }
      }
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const footerText = isSingleChurch && singleChurch 
        ? `${singleChurch.name} - ${dioceseName} Diocese | Generated ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`
        : `${dioceseName} Diocese Church Summary | Generated ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`;
      doc.text(footerText, 105, 290, { align: 'center' });
    }

    // Save
    const fileName = isSingleChurch && singleChurch
      ? `${singleChurch.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().getFullYear()}.pdf`
      : `${dioceseName}_Diocese_Church_Summary_${new Date().getFullYear()}.pdf`;
    doc.save(fileName);
  }

  /**
   * Export Diocese-wide Church Summary as Excel
   * Multiple sheets with complete data
   * If only one church is selected, export detailed single-church report
   */
  static exportDioceseChurchSummaryExcel(
    dioceseName: string,
    analytics: DioceseAnalytics
  ): void {
    const workbook = XLSX.utils.book_new();

    // Check if this is a single church export
    const isSingleChurch = analytics.totalChurches === 1 && analytics.topChurches.length === 1;
    const singleChurch = isSingleChurch ? analytics.topChurches[0] : null;

    if (isSingleChurch && singleChurch) {
      // ========== SINGLE CHURCH EXPORT ==========
      
      // Sheet 1: Parish Information
      const parishInfoData: any[][] = [
        [`${singleChurch.name} - Parish Report`],
        ['Diocese:', dioceseName],
        ['Generated:', new Date().toLocaleDateString()],
        [],
        ['Parish Information'],
        ['Detail', 'Information'],
        ['Parish Name', singleChurch.name],
        ['Municipality', singleChurch.municipality],
        ['Founding Year', singleChurch.foundingYear || 'Not specified'],
        ['Classification', singleChurch.classification === 'NCT' ? 'National Cultural Treasure (NCT)' :
                          singleChurch.classification === 'ICP' ? 'Important Cultural Property (ICP)' : 'Non-Heritage'],
        ['Architectural Style', singleChurch.architecturalStyle || 'Not specified'],
        [],
        ['Engagement Statistics'],
        ['Total Visitors', singleChurch.visitorCount],
        ['Average Rating', `${singleChurch.avgRating.toFixed(1)} / 5.0`],
        ['Total Feedback', singleChurch.feedbackCount],
        ['Status', singleChurch.status]
      ];

      const parishInfoSheet = XLSX.utils.aoa_to_sheet(parishInfoData);
      parishInfoSheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, parishInfoSheet, 'Parish Info');

      // Sheet 2: Historical Background
      const founders = toArray(singleChurch.founders);
      const majorEvents = toArray(singleChurch.majorEvents);
      const historicalBackground = singleChurch.historicalBackground || '';

      const historicalData: any[][] = [
        ['Historical Background'],
        [],
        ['Founders'],
        [founders.length > 0 ? founders.join(', ') : 'Not specified'],
        [],
        ['Historical Background'],
        [historicalBackground || 'Not specified'],
        [],
        ['Major Historical Events']
      ];

      if (majorEvents.length > 0) {
        majorEvents.forEach(event => {
          historicalData.push([`• ${event}`]);
        });
      } else {
        historicalData.push(['No major events recorded']);
      }

      const historicalSheet = XLSX.utils.aoa_to_sheet(historicalData);
      historicalSheet['!cols'] = [{ wch: 100 }];
      XLSX.utils.book_append_sheet(workbook, historicalSheet, 'Historical Background');

      // Sheet 3: Architectural & Heritage Information
      const architecturalFeatures = singleChurch.architecturalFeatures || '';
      const heritageInformation = singleChurch.heritageInformation || '';

      const heritageData: any[][] = [
        ['Architectural & Heritage Information'],
        [],
        ['Architectural Features'],
        [architecturalFeatures || 'Not specified'],
        [],
        ['Heritage Information'],
        [heritageInformation || 'Not specified']
      ];

      const heritageSheet = XLSX.utils.aoa_to_sheet(heritageData);
      heritageSheet['!cols'] = [{ wch: 100 }];
      XLSX.utils.book_append_sheet(workbook, heritageSheet, 'Heritage Info');

      // Save single church file
      const fileName = `${singleChurch.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().getFullYear()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      return;
    }

    // ========== MULTI-CHURCH / DIOCESE EXPORT ==========
    
    // Sheet 1: Diocese Overview - Build rows dynamically based on filtered data
    const overviewData: any[][] = [
      ['Diocese Church Summary Report'],
      ['Diocese:', dioceseName],
      ['Generated:', new Date().toLocaleDateString()],
      [],
      ['Diocese Statistics'],
      ['Metric', 'Value'],
      ['Total Churches', analytics.totalChurches]
    ];

    // Only add classification rows if they have churches
    if (analytics.heritageChurches > 0) {
      overviewData.push(['Heritage Churches (NCT + ICP)', analytics.heritageChurches]);
    }
    if (analytics.churchesByClassification.NCT > 0) {
      overviewData.push(['- National Cultural Treasures', analytics.churchesByClassification.NCT]);
    }
    if (analytics.churchesByClassification.ICP > 0) {
      overviewData.push(['- Important Cultural Properties', analytics.churchesByClassification.ICP]);
    }
    if (analytics.nonHeritageChurches > 0) {
      overviewData.push(['Non-Heritage Churches', analytics.nonHeritageChurches]);
    }

    // Always add visitor statistics
    overviewData.push(
      ['Total Visitors', analytics.totalVisitors],
      ['Total Feedback', analytics.totalFeedback],
      ['Average Rating', analytics.avgRating]
    );

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

    // Sheet 6: Architectural & Heritage Information
    const historicalData = analytics.topChurches
      .filter(church => 
        (toArray(church.founders).length > 0) ||
        (toArray(church.majorEvents).length > 0) ||
        church.architecturalStyle ||
        church.architecturalFeatures ||
        church.heritageInformation
      )
      .map((church, index) => ({
        '#': index + 1,
        'Church Name': church.name,
        'Municipality': church.municipality,
        'Founding Year': church.foundingYear,
        'Architectural Style': church.architecturalStyle || 'N/A',
        'Architectural Features': church.architecturalFeatures || 'N/A',
        'Founders': toArray(church.founders).join('; ') || 'N/A',
        'Major Events': toArray(church.majorEvents).join('; ') || 'N/A',
        'Heritage Information': church.heritageInformation || 'N/A'
      }));

    if (historicalData.length > 0) {
      const historicalSheet = XLSX.utils.json_to_sheet(historicalData);
      historicalSheet['!cols'] = [
        { wch: 5 },   // #
        { wch: 35 },  // Church Name
        { wch: 18 },  // Municipality
        { wch: 14 },  // Founding Year
        { wch: 20 },  // Architectural Style
        { wch: 40 },  // Architectural Features
        { wch: 30 },  // Founders
        { wch: 50 },  // Major Events
        { wch: 50 }   // Heritage Information
      ];
      XLSX.utils.book_append_sheet(workbook, historicalSheet, 'Heritage Info');
    }

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
