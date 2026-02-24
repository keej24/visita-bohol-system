/**
 * Unit tests for church document import parsing logic.
 *
 * These tests verify that `buildParsedDataFromText` correctly:
 * - Maps document labels to form fields
 * - Prevents address text from bleeding into name fields
 * - Normalises enum values (heritage, architecture)
 * - Extracts founding years from various formats
 * - Parses mass schedules
 * - Computes appropriate confidence scores
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock Firebase modules so the service can be imported without a live backend.
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
  updateDoc: vi.fn(),
  Timestamp: { now: vi.fn() },
}));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));
vi.mock('@/lib/firebase', () => ({
  db: {},
  functions: {},
  auth: { currentUser: null },
}));
vi.mock('@/services/uploadService', () => ({
  default: { uploadFile: vi.fn() },
}));

import { buildParsedDataFromText } from '../churchImportService';

// ─── Helper ───────────────────────────────────────────────────────────────────

const getField = (obj: Record<string, any>, path: string): unknown =>
  path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildParsedDataFromText', () => {
  // ── 1. The reported bug: address bleeding into parish name ──────────────
  describe('field boundary detection', () => {
    it('should NOT append next-line address text to parish name', () => {
      const text = [
        'Parish Name: Our Lady of the Immaculate Conception',
        'Baclayon, Bohol',
        'Street Address: P. Belderol St.',
      ].join('\n');

      const { parsedData } = buildParsedDataFromText(text);

      expect(parsedData.parishName).toBe('Our Lady of the Immaculate Conception');
      expect(parsedData.parishName).not.toContain('Baclayon');
    });

    it('should NOT append continuation lines to church name', () => {
      const text = [
        'Church Name: San Pedro Apostol Church',
        'Loboc, Bohol 6316',
        'Municipality: Loboc',
      ].join('\n');

      const { parsedData } = buildParsedDataFromText(text);

      expect(parsedData.churchName).toBe('San Pedro Apostol Church');
      expect(parsedData.churchName).not.toContain('Loboc');
    });

    it('should still allow multi-line values for historical background', () => {
      const text = [
        'Historical Background: The church was built in 1596 by the Jesuits.',
        'It was later expanded by the Augustinian Recollects in the 18th century.',
        'The structure survived several earthquakes.',
        'Municipality: Baclayon',
      ].join('\n');

      const { parsedData } = buildParsedDataFromText(text);
      const bg = getField(parsedData as Record<string, any>, 'historicalDetails.historicalBackground') as string;

      expect(bg).toContain('built in 1596 by the Jesuits');
      expect(bg).toContain('Augustinian Recollects');
      expect(bg).toContain('survived several earthquakes');
    });
  });

  // ── 2. Standard colon-separated extraction ─────────────────────────────
  describe('standard label:value extraction', () => {
    const standardDoc = [
      'Parish Name: Our Lady of the Assumption Parish',
      'Church Name: Dauis Church',
      'Street Address: National Road',
      'Barangay: Poblacion',
      'Municipality: Dauis',
      'Province: Bohol',
      'Current Parish Priest: Fr. Juan Dela Cruz',
      'Feast Day: August 15',
      'Founding Year: 1697',
      'Heritage Classification: National Cultural Treasure',
      'Architectural Style: Baroque',
      'Contact Phone: 0917-123-4567',
      'Contact Email: dauis@tagbilarandiocese.ph',
      'Facebook Page: https://facebook.com/dauischurch',
    ].join('\n');

    let parsedData: any;
    let confidence: Record<string, number>;

    beforeAll(() => {
      const result = buildParsedDataFromText(standardDoc);
      parsedData = result.parsedData;
      confidence = result.confidence;
    });

    it('extracts parish name', () => {
      expect(parsedData.parishName).toBe('Our Lady of the Assumption Parish');
    });

    it('extracts church name', () => {
      expect(parsedData.churchName).toBe('Dauis Church');
    });

    it('extracts location details', () => {
      expect(getField(parsedData, 'locationDetails.streetAddress')).toBe('National Road');
      expect(getField(parsedData, 'locationDetails.barangay')).toBe('Poblacion');
      expect(getField(parsedData, 'locationDetails.municipality')).toBe('Dauis');
      expect(getField(parsedData, 'locationDetails.province')).toBe('Bohol');
    });

    it('extracts priest and feast day', () => {
      expect(parsedData.currentParishPriest).toBe('Fr. Juan Dela Cruz');
      expect(parsedData.feastDay).toBe('August 15');
    });

    it('extracts and validates founding year with high confidence', () => {
      expect(getField(parsedData, 'historicalDetails.foundingYear')).toBe('1697');
      expect(confidence['historicalDetails.foundingYear']).toBeGreaterThanOrEqual(0.9);
    });

    it('normalises heritage classification', () => {
      expect(getField(parsedData, 'historicalDetails.heritageClassification')).toBe('National Cultural Treasures');
      expect(confidence['historicalDetails.heritageClassification']).toBeGreaterThanOrEqual(0.9);
    });

    it('normalises architectural style', () => {
      expect(getField(parsedData, 'historicalDetails.architecturalStyle')).toBe('Baroque');
      expect(confidence['historicalDetails.architecturalStyle']).toBeGreaterThanOrEqual(0.9);
    });

    it('extracts contact details', () => {
      expect(getField(parsedData, 'contactInfo.phone')).toBe('0917-123-4567');
      expect(getField(parsedData, 'contactInfo.email')).toBe('dauis@tagbilarandiocese.ph');
      expect(getField(parsedData, 'contactInfo.facebookPage')).toBe('https://facebook.com/dauischurch');
    });

    it('assigns high confidence to valid phone', () => {
      expect(confidence['contactInfo.phone']).toBeGreaterThanOrEqual(0.8);
    });

    it('assigns high confidence to valid email', () => {
      expect(confidence['contactInfo.email']).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ── 3. Alternative label names ──────────────────────────────────────────
  describe('alternative label aliases', () => {
    it('handles "Year Founded" alias', () => {
      const text = 'Year Founded: 1602';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.foundingYear')).toBe('1602');
    });

    it('handles "Date Established" alias with date string', () => {
      const text = 'Date Established: March 15, 1850';
      const { parsedData, confidence } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.foundingYear')).toBe('1850');
      expect(confidence['historicalDetails.foundingYear']).toBeGreaterThanOrEqual(0.9);
    });

    it('handles "Year Built" alias', () => {
      const text = 'Year Built: 1768';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.foundingYear')).toBe('1768');
    });

    it('handles "Construction Year" alias', () => {
      const text = 'Construction Year: 1803';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.foundingYear')).toBe('1803');
    });

    it('handles "Parish Priest" without "Current" prefix', () => {
      const text = 'Parish Priest: Fr. Pedro Santos';
      const { parsedData } = buildParsedDataFromText(text);
      expect(parsedData.currentParishPriest).toBe('Fr. Pedro Santos');
    });

    it('handles "Parish Administrator" alias', () => {
      const text = 'Parish Administrator: Fr. Marco Reyes';
      const { parsedData } = buildParsedDataFromText(text);
      expect(parsedData.currentParishPriest).toBe('Fr. Marco Reyes');
    });

    it('handles "Contact Number" alias for phone', () => {
      const text = 'Contact Number: 038-501-1234';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'contactInfo.phone')).toBe('038-501-1234');
    });

    it('handles "Mobile Number" alias for phone', () => {
      const text = 'Mobile Number: 09171234567';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'contactInfo.phone')).toBe('09171234567');
    });
  });

  // ── 4. Heritage classification normalization ────────────────────────────
  describe('heritage classification normalization', () => {
    it('normalizes "ICP" to full form', () => {
      const text = 'Heritage Classification: ICP';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.heritageClassification')).toBe('Important Cultural Properties');
    });

    it('normalizes "NCT" to full form', () => {
      const text = 'Heritage Classification: NCT';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.heritageClassification')).toBe('National Cultural Treasures');
    });

    it('normalizes "Important Cultural Property" (singular)', () => {
      const text = 'Heritage Classification: Important Cultural Property';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.heritageClassification')).toBe('Important Cultural Properties');
    });

    it('normalizes "None"', () => {
      const text = 'Heritage Classification: None';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.heritageClassification')).toBe('None');
    });
  });

  // ── 5. Architectural style normalization ────────────────────────────────
  describe('architectural style normalization', () => {
    it('normalizes "gothic" to "Neo-Gothic"', () => {
      const text = 'Architectural Style: Gothic';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.architecturalStyle')).toBe('Neo-Gothic');
    });

    it('normalizes "neoclassical" to "Neo-Classical"', () => {
      const text = 'Architectural Style: Neoclassical';
      const { parsedData } = buildParsedDataFromText(text);
      expect(getField(parsedData, 'historicalDetails.architecturalStyle')).toBe('Neo-Classical');
    });
  });

  // ── 6. Concatenated text splitting (PDF artifact) ──────────────────────
  describe('concatenated field boundary splitting', () => {
    it('splits concatenated "Municipality: DauisFounding Year: 1697"', () => {
      const text = 'Municipality: DauisFounding Year: 1697';
      const { parsedData } = buildParsedDataFromText(text);

      expect(getField(parsedData, 'locationDetails.municipality')).toBe('Dauis');
      expect(getField(parsedData, 'historicalDetails.foundingYear')).toBe('1697');
    });

    it('splits multiple concatenated fields', () => {
      const text = 'Parish Name: Test ParishChurch Name: Test ChurchMunicipality: Tagbilaran';
      const { parsedData } = buildParsedDataFromText(text);

      expect(parsedData.parishName).toBe('Test Parish');
      expect(parsedData.churchName).toBe('Test Church');
      expect(getField(parsedData, 'locationDetails.municipality')).toBe('Tagbilaran');
    });
  });

  // ── 7. Confidence scoring ──────────────────────────────────────────────
  describe('confidence scoring', () => {
    it('assigns low confidence to garbled founding year', () => {
      const text = 'Founding Year: unknown or circa sixteen hundreds';
      const { confidence } = buildParsedDataFromText(text);

      expect(confidence['historicalDetails.foundingYear']).toBeLessThanOrEqual(0.3);
    });

    it('assigns low confidence when parish name contains address hints', () => {
      // This would happen if someone mistakenly puts "Parish Name: Some Church, Bohol"
      const text = 'Parish Name: Some Church, Bohol';
      const { confidence } = buildParsedDataFromText(text);

      expect(confidence['parishName']).toBeLessThanOrEqual(0.4);
    });

    it('assigns low confidence to invalid email', () => {
      const text = 'Contact Email: not-an-email';
      const { confidence } = buildParsedDataFromText(text);

      expect(confidence['contactInfo.email']).toBeLessThanOrEqual(0.3);
    });

    it('assigns high confidence to long historical background', () => {
      const bg = 'A'.repeat(150);
      const text = `Historical Background: ${bg}`;
      const { confidence } = buildParsedDataFromText(text);

      expect(confidence['historicalDetails.historicalBackground']).toBeGreaterThanOrEqual(0.8);
    });

    it('assigns high confidence for valid heritage classification', () => {
      const text = 'Heritage Classification: NCT';
      const { confidence } = buildParsedDataFromText(text);

      expect(confidence['historicalDetails.heritageClassification']).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ── 8. Mass schedule extraction ─────────────────────────────────────────
  describe('mass schedule extraction', () => {
    it('parses semicolon-separated schedule', () => {
      const text = 'Mass Schedule: Sunday 7:00 AM, 9:00 AM; Saturday 5:30 PM';
      const { parsedData } = buildParsedDataFromText(text);

      const schedules = parsedData.massSchedules;
      expect(schedules).toBeDefined();
      expect(Array.isArray(schedules)).toBe(true);
      expect(schedules!.length).toBeGreaterThanOrEqual(2);
      expect(schedules!.some((s: any) => s.day === 'Sunday')).toBe(true);
      expect(schedules!.some((s: any) => s.day === 'Saturday')).toBe(true);
    });

    it('parses "Schedule of Masses" alias', () => {
      const text = 'Schedule of Masses: Sunday 6:00 AM';
      const { parsedData } = buildParsedDataFromText(text);

      const schedules = parsedData.massSchedules;
      expect(schedules).toBeDefined();
      expect(schedules!.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 9. Empty / no-label documents ───────────────────────────────────────
  describe('edge cases', () => {
    it('returns empty parsedData for empty text', () => {
      const { parsedData } = buildParsedDataFromText('');
      // No crash, parsedData should be an empty or near-empty object
      expect(parsedData.parishName).toBeUndefined();
      expect(parsedData.churchName).toBeUndefined();
    });

    it('returns empty parsedData for unstructured prose', () => {
      const text = 'This is just a paragraph of text about a church with no labels.';
      const { parsedData } = buildParsedDataFromText(text);
      expect(parsedData.parishName).toBeUndefined();
    });

    it('handles whitespace-only input without crashing', () => {
      const { parsedData } = buildParsedDataFromText('   \n\n  \n');
      expect(parsedData.parishName).toBeUndefined();
    });
  });
});
