import jsPDF from 'jspdf';
import { LogoService } from '@/services/logoService';

/**
 * Reads a base64-encoded image and returns its natural width & height.
 * Used to preserve aspect ratio when embedding logos in PDFs.
 */
function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Given natural image dimensions, returns the width and height (in mm)
 * that fit inside a square bounding box while preserving aspect ratio.
 */
function fitToBox(
  naturalWidth: number,
  naturalHeight: number,
  boxSize: number
): { w: number; h: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) return { w: boxSize, h: boxSize };
  const ratio = naturalWidth / naturalHeight;
  if (ratio >= 1) {
    // landscape or square — constrain by width
    return { w: boxSize, h: boxSize / ratio };
  }
  // portrait — constrain by height
  return { w: boxSize * ratio, h: boxSize };
}

export interface ReportHeaderOptions {
  /** Main title line (e.g., "Diocese of Tagbilaran") */
  title: string;
  /** Subtitle line (e.g., "CHURCH SUMMARY REPORT") */
  subtitle: string;
  /** Optional third line (e.g., church name or total count) */
  detail?: string;
  /** Diocese ID for logo lookup */
  dioceseId?: string;
  /** Parish ID for logo lookup */
  parishId?: string;
  /** Pre-fetched logos (skip Firestore fetch if provided) */
  logos?: {
    dioceseLogo: string | null;
    parishLogo: string | null;
  };
}

/**
 * Adds a branded header to a jsPDF document with optional diocese and parish logos.
 *
 * Layout:
 * ┌──────────────────────────────────────────────┐
 * │ [Diocese Logo]   Title / Subtitle   [Parish] │
 * │                   Detail                     │
 * └──────────────────────────────────────────────┘
 *
 * Falls back to text-only header (matching the existing style) if no logos are available.
 *
 * @returns The Y position below the header where content should start
 */
export async function addReportHeader(
  doc: jsPDF,
  options: ReportHeaderOptions
): Promise<number> {
  const { title, subtitle, detail, dioceseId, parishId, logos: preloadedLogos } = options;

  // Fetch logos if not pre-loaded
  let dioceseLogo: string | null = null;
  let parishLogo: string | null = null;

  if (preloadedLogos) {
    dioceseLogo = preloadedLogos.dioceseLogo;
    parishLogo = preloadedLogos.parishLogo;
  } else if (dioceseId) {
    try {
      const fetched = await LogoService.getLogosForReport(dioceseId, parishId);
      dioceseLogo = fetched.dioceseLogo;
      parishLogo = fetched.parishLogo;
    } catch (error) {
      console.warn('⚠️ Could not fetch logos for report header:', error);
    }
  }

  const hasLogos = dioceseLogo || parishLogo;
  const headerHeight = hasLogos ? 50 : 45;
  const pageWidth = doc.internal.pageSize.width; // 210 for A4

  // Draw header background — Deep Ecclesiastical Blue
  doc.setFillColor(17, 40, 110);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Determine logo dimensions
  const logoSize = 22; // mm, square bounding box
  const logoPadding = 10; // mm from edge

  // Add diocese logo on the LEFT (aspect-ratio preserved)
  if (dioceseLogo) {
    try {
      const format = dioceseLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const dims = await getImageDimensions(dioceseLogo).catch(() => ({ width: 1, height: 1 }));
      const { w, h } = fitToBox(dims.width, dims.height, logoSize);
      const logoX = logoPadding + (logoSize - w) / 2; // center within bounding box
      const logoY = (headerHeight - h) / 2;            // vertically centered
      doc.addImage(dioceseLogo, format, logoX, logoY, w, h);
    } catch (error) {
      console.warn('⚠️ Could not embed diocese logo in PDF:', error);
    }
  }

  // Add parish logo on the RIGHT (aspect-ratio preserved)
  if (parishLogo) {
    try {
      const format = parishLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const dims = await getImageDimensions(parishLogo).catch(() => ({ width: 1, height: 1 }));
      const { w, h } = fitToBox(dims.width, dims.height, logoSize);
      const logoX = pageWidth - logoPadding - logoSize + (logoSize - w) / 2; // center within bounding box
      const logoY = (headerHeight - h) / 2;                                   // vertically centered
      doc.addImage(parishLogo, format, logoX, logoY, w, h);
    } catch (error) {
      console.warn('⚠️ Could not embed parish logo in PDF:', error);
    }
  }

  // Calculate text area (narrower if logos present)
  const textCenterX = pageWidth / 2;

  // Title
  doc.setFontSize(hasLogos ? 18 : 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  if (hasLogos) {
    doc.text(title, textCenterX, 18, { align: 'center' });
  } else {
    doc.text(title, textCenterX, 18, { align: 'center' });
  }

  // Subtitle
  doc.setFontSize(hasLogos ? 12 : 14);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, textCenterX, hasLogos ? 28 : 28, { align: 'center' });

  // Optional detail line
  if (detail) {
    doc.setFontSize(hasLogos ? 10 : 11);
    doc.text(detail, textCenterX, hasLogos ? 37 : 38, { align: 'center' });
  }

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Return Y position below header for content to start
  return headerHeight + 10;
}

/**
 * Add a standard footer to all pages of a PDF document.
 * Should be called after all content is added.
 */
export function addReportFooter(
  doc: jsPDF,
  footerText: string
): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${footerText} | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
  }
}
