/**
 * Parish Utility Functions
 * 
 * Provides functions for generating unique parish identifiers and managing
 * parish-related data to prevent conflicts from duplicate parish names.
 * 
 * PROBLEM SOLVED:
 * Multiple parishes can have the same name (e.g., "San Isidro Labrador Parish")
 * in different municipalities. Using just the name as an identifier causes
 * data corruption when one parish overwrites another's data.
 * 
 * SOLUTION:
 * Generate composite unique identifiers using:
 * diocese + municipality + parish_name = unique ID
 */

import type { Diocese } from '@/contexts/AuthContext';

/**
 * Normalize a string for use in IDs
 * - Convert to lowercase
 * - Standardize common variations (St. → Saint, Sto. → Santo)
 * - Remove special characters
 * - Replace spaces with underscores
 * - Remove multiple consecutive underscores
 * - Trim leading/trailing underscores
 */
function normalizeForId(str: string): string {
  // First, standardize common saint abbreviations
  const normalized = str
    .toLowerCase()
    // Standardize saint variations
    .replace(/\bst\.\s*/g, 'saint_')      // "St. Joseph" → "saint_joseph"
    .replace(/\bst\s+/g, 'saint_')        // "St Joseph" → "saint_joseph"
    .replace(/\bsto\.\s*/g, 'santo_')     // "Sto. Niño" → "santo_niño"
    .replace(/\bsto\s+/g, 'santo_')       // "Sto Niño" → "santo_niño"
    .replace(/\bsta\.\s*/g, 'santa_')     // "Sta. Maria" → "santa_maria"
    .replace(/\bsta\s+/g, 'santa_')       // "Sta Maria" → "santa_maria"
    // Standardize "parish" and "church" (optional at end)
    .replace(/\s+parish$/i, '')           // Remove "parish" suffix
    .replace(/\s+church$/i, '');          // Remove "church" suffix
  
  // Then apply standard normalization
  return normalized
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Generate a unique parish identifier
 * 
 * Format: {diocese}_{municipality}_{parish_name}
 * 
 * Examples:
 * - "San Isidro Labrador Parish" in Alburquerque, Tagbilaran
 *   → "tagbilaran_alburquerque_san_isidro_labrador_parish"
 * 
 * - "San Isidro Labrador Parish" in Buenavista, Tagbilaran  
 *   → "tagbilaran_buenavista_san_isidro_labrador_parish"
 * 
 * - "Santo Niño Parish" in Tagbilaran City, Tagbilaran
 *   → "tagbilaran_tagbilaran_city_santo_nino_parish"
 */
export function generateParishId(
  diocese: Diocese,
  municipality: string,
  parishName: string
): string {
  if (!diocese || !municipality || !parishName) {
    throw new Error('Diocese, municipality, and parish name are required to generate parish ID');
  }

  const dioceseCode = normalizeForId(diocese);
  const municipalityCode = normalizeForId(municipality);
  const parishCode = normalizeForId(parishName);

  return `${dioceseCode}_${municipalityCode}_${parishCode}`;
}

/**
 * Format parish display name with location
 * 
 * Examples:
 * - "San Isidro Labrador Parish, Alburquerque"
 * - "Santo Niño Parish, Tagbilaran City"
 */
export function formatParishFullName(parishName: string, municipality: string): string {
  return `${parishName}, ${municipality}`;
}

/**
 * Extract components from a parish ID
 * 
 * Input: "tagbilaran_alburquerque_san_isidro_labrador_parish"
 * Output: { diocese: "tagbilaran", municipality: "alburquerque", parishName: "san_isidro_labrador_parish" }
 */
export function parseParishId(parishId: string): {
  diocese: string;
  municipality: string;
  parishName: string;
} | null {
  const parts = parishId.split('_');
  
  if (parts.length < 3) {
    return null;
  }

  const [diocese, municipality, ...parishNameParts] = parts;
  
  return {
    diocese,
    municipality,
    parishName: parishNameParts.join('_')
  };
}

/**
 * Validate that a parish ID follows the expected format
 */
export function isValidParishId(parishId: string): boolean {
  const parsed = parseParishId(parishId);
  return parsed !== null && parsed.diocese.length > 0 && parsed.municipality.length > 0;
}

/**
 * Check if two parishes are the same (same name and location)
 */
export function isSameParish(
  parishId1: string,
  parishId2: string
): boolean {
  return parishId1 === parishId2;
}

/**
 * Get all municipalities in a diocese (for dropdowns)
 * 
 * Source: Official Catholic Bishops' Conference of the Philippines (CBCP) and Wikipedia
 * - Diocese of Tagbilaran: Western Bohol (27 municipalities)
 * - Diocese of Talibon: Eastern Bohol (21 municipalities)
 * 
 * Reference: 
 * - https://en.wikipedia.org/wiki/Roman_Catholic_Diocese_of_Tagbilaran
 * - https://en.wikipedia.org/wiki/Roman_Catholic_Diocese_of_Talibon
 */
export function getMunicipalitiesByDiocese(diocese: Diocese): string[] {
  const municipalities = {
    // Diocese of Tagbilaran - Western Bohol (27 municipalities)
    tagbilaran: [
      'Alburquerque',
      'Antequera',
      'Baclayon',
      'Balilihan',
      'Batuan',
      'Bilar',
      'Calape',
      'Catigbian',
      'Clarin',
      'Corella',
      'Cortes',
      'Dauis',
      'Dimiao',
      'Garcia Hernandez',
      'Lila',
      'Loay',
      'Loboc',
      'Loon',
      'Maribojoc',
      'Panglao',
      'Sagbayan',
      'San Isidro',
      'Sevilla',
      'Sikatuna',
      'Tagbilaran City',
      'Tubigon',
      'Valencia'
    ],
    // Diocese of Talibon - Eastern Bohol (21 municipalities)
    talibon: [
      'Alicia',
      'Anda',
      'Bien Unido',
      'Buenavista',
      'Candijay',
      'Carmen',
      'Dagohoy',
      'Danao',
      'Duero',
      'Getafe',
      'Guindulman',
      'Inabanga',
      'Jagna',
      'Mabini',
      'Pilar',
      'President Carlos P. Garcia',
      'San Miguel',
      'Sierra Bullones',
      'Talibon',
      'Trinidad',
      'Ubay'
    ]
  };

  return municipalities[diocese] || [];
}
