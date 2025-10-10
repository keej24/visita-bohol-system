// Heritage detection logic for automatic workflow routing
export type HeritageClassification = 'ICP' | 'NCT' | 'non-heritage' | 'unknown';

export interface HeritageCheckContext {
  classification?: HeritageClassification;
  foundedYear?: number;
  hasHistoricalDocuments?: boolean;
  architecturalSignificance?: boolean;
}

/**
 * Determines if a church submission should be routed to heritage review
 * based on classification and other factors
 */
export function shouldRequireHeritageReview(context: HeritageCheckContext): boolean {
  // If already classified as heritage (ICP or NCT), require review
  if (context.classification === 'ICP' || context.classification === 'NCT') {
    return true;
  }
  
  // If founded before 1900, might be heritage
  if (context.foundedYear && context.foundedYear < 1900) {
    return true;
  }
  
  // If has significant historical documents
  if (context.hasHistoricalDocuments) {
    return true;
  }
  
  // If marked as architecturally significant
  if (context.architecturalSignificance) {
    return true;
  }
  
  return false;
}

/**
 * Suggests heritage classification based on context
 */
export function suggestHeritageClassification(context: HeritageCheckContext): HeritageClassification {
  if (context.classification && context.classification !== 'unknown') {
    return context.classification;
  }
  
  // Churches founded before 1800 are likely heritage
  if (context.foundedYear && context.foundedYear < 1800) {
    return 'ICP'; // Suggest Important Cultural Property
  }
  
  // Churches founded between 1800-1900 might be heritage
  if (context.foundedYear && context.foundedYear < 1900) {
    return 'ICP';
  }
  
  return 'non-heritage';
}
