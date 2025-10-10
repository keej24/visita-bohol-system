import type { ChurchInfo } from '@/components/parish/types';
import type { Church } from '@/lib/churches';

export interface HeritageIndicator {
  name: string;
  present: boolean;
  weight: number; // 1-3 scale, 3 being highest importance
  description: string;
}

export interface HeritageAssessment {
  shouldRequireReview: boolean;
  confidence: 'low' | 'medium' | 'high';
  indicators: HeritageIndicator[];
  recommendation: 'auto_approve' | 'heritage_review' | 'detailed_review';
  reasoning: string;
}

/**
 * Analyzes church data to determine if heritage review is required
 * Simplified to only check for ICP or NCT classification
 */
export function assessHeritageSignificance(
  church: ChurchInfo | Church | Partial<ChurchInfo>
): HeritageAssessment {
  const indicators: HeritageIndicator[] = [];

  // Only check for explicit Heritage Classification (ICP or NCT)
  const heritageClass = church.historicalDetails?.heritageClassification || church.classification;

  let shouldRequireReview = false;
  let confidence: 'low' | 'medium' | 'high' = 'low';
  let recommendation: 'auto_approve' | 'heritage_review' | 'detailed_review' = 'auto_approve';

  if (heritageClass === 'National Cultural Treasures') {
    indicators.push({
      name: 'declared_nct',
      present: true,
      weight: 3,
      description: 'Classified as National Cultural Treasure (NCT) - requires heritage review'
    });
    shouldRequireReview = true;
    confidence = 'high';
    recommendation = 'heritage_review';
  } else if (heritageClass === 'Important Cultural Properties') {
    indicators.push({
      name: 'declared_icp',
      present: true,
      weight: 3,
      description: 'Classified as Important Cultural Property (ICP) - requires heritage review'
    });
    shouldRequireReview = true;
    confidence = 'high';
    recommendation = 'heritage_review';
  } else {
    indicators.push({
      name: 'no_heritage_classification',
      present: false,
      weight: 0,
      description: 'No ICP or NCT classification - standard approval process'
    });
    shouldRequireReview = false;
    confidence = 'low';
    recommendation = 'auto_approve';
  }

  const reasoning = generateReasoning(indicators, confidence);

  return {
    shouldRequireReview,
    confidence,
    indicators,
    recommendation,
    reasoning
  };
}

function generateReasoning(indicators: HeritageIndicator[], confidence: string): string {
  const presentIndicators = indicators.filter(i => i.present);

  if (presentIndicators.length > 0 && confidence === 'high') {
    const heritageType = presentIndicators[0]?.name === 'declared_nct' ? 'National Cultural Treasure (NCT)' : 'Important Cultural Property (ICP)';
    return `Church is classified as ${heritageType}. Must be forwarded to Museum Researcher for heritage validation.`;
  } else {
    return `No heritage classification (ICP or NCT) found. Standard Chancery approval process applies.`;
  }
}

/**
 * Helper function specifically for the existing workflow
 * Returns true if church should be automatically sent to heritage review
 */
export function shouldRequireHeritageReview(church: ChurchInfo | Church | Partial<ChurchInfo>): boolean {
  const assessment = assessHeritageSignificance(church);
  return assessment.shouldRequireReview;
}

/**
 * Get user-friendly explanation for heritage assessment
 */
export function getHeritageExplanation(church: ChurchInfo | Church | Partial<ChurchInfo>): string {
  const assessment = assessHeritageSignificance(church);
  return assessment.reasoning;
}

/**
 * Get detailed heritage assessment for admin review
 */
export function getDetailedHeritageAssessment(
  church: ChurchInfo | Church | Partial<ChurchInfo>
): HeritageAssessment {
  return assessHeritageSignificance(church);
}
