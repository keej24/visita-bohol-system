/**
 * FILE PURPOSE: Church Field Categorization for Staged Updates
 *
 * This module defines which church fields require re-verification when updated
 * (sensitive fields) vs. which can be published immediately (operational fields).
 *
 * RATIONALE:
 * - Heritage/historical information needs Chancery/Museum review for accuracy
 * - Operational info (mass schedules, contact) changes frequently and should update immediately
 * - 360° photos/virtual tours don't require re-verification per stakeholder decision
 *
 * WORKFLOW:
 * When a parish updates an APPROVED church:
 * 1. DIRECT_PUBLISH_FIELDS → Applied immediately to the live profile
 * 2. REVERIFICATION_REQUIRED_FIELDS → Stored in pendingChanges, awaits approval
 *
 * The existing 3-stage workflow applies to pending changes:
 * Parish submits → Chancery reviews (can edit) → Museum reviews if heritage → Approved
 */

import type { ChurchFormData } from '@/types/church';

/**
 * Fields that require Chancery (and Museum for heritage) approval before publishing.
 * These contain historical/heritage information that needs expert verification.
 */
export const REVERIFICATION_REQUIRED_FIELDS: (keyof ChurchFormData)[] = [
  // Core identification
  'name',
  'fullName',
  'location',
  'municipality',
  
  // Historical information (requires accuracy verification)
  'foundingYear',
  'founders',
  'keyFigures',
  'historicalBackground',
  'description',
  
  // Architectural/heritage classification
  'architecturalStyle',
  'classification',
  'religiousClassification',
  'historicalDetails',
  
  // Heritage-specific fields (Museum Researcher validation)
  'culturalSignificance',
  'preservationHistory',
  'restorationHistory',
  'architecturalFeatures',
  'heritageInformation',
  
  // Coordinates (affects map placement)
  'coordinates',
];

/**
 * Fields that can be updated immediately without re-verification.
 * These are operational/dynamic and change frequently.
 */
export const DIRECT_PUBLISH_FIELDS: (keyof ChurchFormData)[] = [
  // Contact and scheduling (changes frequently)
  'contactInfo',
  'massSchedules',
  'assignedPriest',
  'priest_assignment',
  'feastDay',
  
  // Media (360° photos explicitly excluded from re-verification per stakeholder)
  'images',
  'photos',
  'documents',
  'virtualTour360',
  
  // Metadata/tags
  'tags',
  'category',
];

/**
 * Determines which fields from an update require re-verification.
 * 
 * @param originalData - Current published church data
 * @param updatedData - New data being submitted
 * @returns Object with categorized changes
 */
export function categorizeChanges(
  originalData: Partial<ChurchFormData>,
  updatedData: Partial<ChurchFormData>
): {
  hasSensitiveChanges: boolean;
  sensitiveChanges: Partial<ChurchFormData>;
  sensitiveFields: string[];
  directPublishChanges: Partial<ChurchFormData>;
  directPublishFields: string[];
} {
  const sensitiveChanges: Partial<ChurchFormData> = {};
  const sensitiveFields: string[] = [];
  const directPublishChanges: Partial<ChurchFormData> = {};
  const directPublishFields: string[] = [];

  // Check each field in the update
  for (const key of Object.keys(updatedData) as (keyof ChurchFormData)[]) {
    const originalValue = originalData[key];
    const updatedValue = updatedData[key];

    // Normalize empty-ish values to avoid false-positive diffs
    // (e.g., undefined vs '' vs null should all be treated as "no value")
    const normalize = (v: unknown): unknown => {
      if (v === undefined || v === null || v === '') return null;
      if (Array.isArray(v) && v.length === 0) return null;
      return v;
    };

    // Skip if value hasn't changed (after normalization)
    if (JSON.stringify(normalize(originalValue)) === JSON.stringify(normalize(updatedValue))) {
      continue;
    }

    // Categorize the changed field
    if (REVERIFICATION_REQUIRED_FIELDS.includes(key)) {
      (sensitiveChanges as Record<string, unknown>)[key] = updatedValue;
      sensitiveFields.push(key);
    } else if (DIRECT_PUBLISH_FIELDS.includes(key)) {
      (directPublishChanges as Record<string, unknown>)[key] = updatedValue;
      directPublishFields.push(key);
    } else {
      // Unknown fields default to requiring verification for safety
      (sensitiveChanges as Record<string, unknown>)[key] = updatedValue;
      sensitiveFields.push(key);
    }
  }

  return {
    hasSensitiveChanges: sensitiveFields.length > 0,
    sensitiveChanges,
    sensitiveFields,
    directPublishChanges,
    directPublishFields,
  };
}

/**
 * Checks if a specific field requires re-verification.
 * 
 * @param fieldName - The field name to check
 * @returns true if the field requires approval, false if it can publish directly
 */
export function requiresVerification(fieldName: string): boolean {
  return REVERIFICATION_REQUIRED_FIELDS.includes(fieldName as keyof ChurchFormData);
}

/**
 * Gets a human-readable label for a field name.
 * Used in the review UI to show which fields changed.
 * 
 * @param fieldName - The field name
 * @returns Human-readable label
 */
export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    name: 'Church Name',
    fullName: 'Full Name',
    location: 'Location',
    municipality: 'Municipality',
    foundingYear: 'Founding Year',
    founders: 'Founders',
    keyFigures: 'Key Figures',
    historicalBackground: 'Historical Background',
    description: 'Description',
    architecturalStyle: 'Architectural Style',
    classification: 'Heritage Classification',
    religiousClassification: 'Religious Classification',
    historicalDetails: 'Historical Details',
    culturalSignificance: 'Cultural Significance',
    preservationHistory: 'Preservation History',
    restorationHistory: 'Restoration History',
    architecturalFeatures: 'Architectural Features',
    heritageInformation: 'Heritage Information',
    coordinates: 'Map Coordinates',
    contactInfo: 'Contact Information',
    massSchedules: 'Mass Schedules',
    assignedPriest: 'Assigned Priest',
    priest_assignment: 'Priest Assignment History',
    feastDay: 'Feast Day',
    images: 'Images',
    photos: 'Photos',
    documents: 'Documents',
    virtualTour360: '360° Virtual Tour',
    tags: 'Tags',
    category: 'Category',
  };

  return labels[fieldName] || fieldName;
}
