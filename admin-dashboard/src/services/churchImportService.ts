import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import uploadService, { type UploadProgress } from '@/services/uploadService';
import type { ChurchInfo, ChurchImportSession, MassSchedule } from '@/components/parish/types';

const MAX_UPLOAD_MB = 20;

/**
 * Build a Firestore reference to the import_sessions subcollection
 * under a specific church document: churches/{churchId}/import_sessions
 */
const importSessionsCollection = (churchId: string) =>
  collection(db, 'churches', churchId, 'import_sessions');

const importSessionDoc = (churchId: string, importId: string) =>
  doc(db, 'churches', churchId, 'import_sessions', importId);

const isTextFile = (file: File) => {
  if (file.type.startsWith('text/')) return true;
  return /\.(txt|md|csv)$/i.test(file.name);
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const setNestedValue = (target: Record<string, any>, path: string, value: unknown) => {
  const keys = path.split('.');
  let cursor = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, any>;
  }
  cursor[keys[keys.length - 1]] = value;
};

// All known labels used to detect field boundaries.
// Longer labels are listed first so they match before shorter prefixes.
const ALL_KNOWN_LABELS = [
  'Parish Name', 'Church Name', 'Parish', 'Church',
  'Location Details', 'Street Address', 'Address',
  'Barangay', 'Municipality', 'City', 'Town', 'Province',
  'Current Parish Priest', 'Parish Priest', 'Current Priest', 'Priest',
  'Parish Administrator',
  'Feast Day', 'Patron Feast Day', 'Patron Saint', 'Patron',
  'Founding Year', 'Year Founded', 'Year Established', 'Year Built',
  'Date Established', 'Date Founded', 'Construction Year', 'Founded',
  'Founders', 'Founded By', 'Founding Organization',
  'Architectural Style', 'Architecture',
  'Heritage Classification', 'Heritage Class',
  'Religious Classification', 'Religious Class',
  'Historical Background', 'Historical background', 'Church History', 'History',
  'Architectural Information', 'Architectural Features', 'Design Features', 'Building Features', 'Notable Features',
  'Heritage Information', 'Heritage Details', 'Heritage Status', 'Cultural Significance',
  'Contact Phone', 'Contact Number', 'Contact #', 'Phone', 'Telephone',
  'Mobile Number', 'Mobile', 'Tel',
  'Contact Email', 'Email',
  'Official Website', 'Website',
  'Facebook Page', 'Facebook',
  'Mass Schedules', 'Mass Schedule', 'Schedule of Masses', 'Worship Schedule',
  'GPS Coordinates', 'Coordinates', 'Latitude', 'Longitude',
  'Diocese', 'Vicariate'
].sort((a, b) => b.length - a.length);

// Fields whose values legitimately span multiple lines.
// For all other fields, continuation lines are NOT appended.
const MULTI_LINE_LABELS = new Set([
  'historical background', 'church history', 'history',
  'architectural information', 'architectural features', 'design features',
  'building features', 'notable features',
  'heritage information', 'heritage details', 'heritage status', 'cultural significance',
  'mass schedules', 'mass schedule', 'schedule of masses', 'worship schedule'
]);

/**
 * Pre-process raw text: split concatenated fields onto separate lines
 * and join multi-line values that belong to the same field.
 */
const preprocessText = (text: string): Map<string, string> => {
  // Phase 1: Insert line breaks before any known "Label:" pattern so
  // concatenated text like "Municipality: DauisFounding Year: 1697" is split.
  const labelPattern = ALL_KNOWN_LABELS
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const splitRegex = new RegExp(`(?<=[^\\n])(?=(${labelPattern})\\s*:)`, 'gi');
  const normalized = text.replace(splitRegex, '\n');

  // Phase 2: Walk lines and pair each label with its (possibly multi-line) value.
  const lines = normalized.split(/\r?\n/);
  const result = new Map<string, string>();
  let currentLabel = '';
  let currentValue = '';

  const labelLineRegex = new RegExp(
    `^\\s*(${labelPattern})\\s*:\\s*(.*)$`, 'i'
  );

  for (const line of lines) {
    const match = line.match(labelLineRegex);
    if (match) {
      // Store previous field
      if (currentLabel) {
        result.set(currentLabel.toLowerCase(), normalizeWhitespace(currentValue));
      }
      currentLabel = match[1];
      currentValue = match[2] || '';
    } else if (currentLabel) {
      // Only append continuation lines for multi-line fields (e.g. history, features).
      // For short fields like names/addresses, ignore stray continuation lines
      // to prevent address text bleeding into parish/church name fields.
      const trimmed = line.trim();
      if (trimmed && MULTI_LINE_LABELS.has(currentLabel.toLowerCase())) {
        currentValue += ' ' + trimmed;
      }
    }
  }
  // Store last field
  if (currentLabel) {
    result.set(currentLabel.toLowerCase(), normalizeWhitespace(currentValue));
  }

  return result;
};

/**
 * Normalize dropdown values so extracted text maps to valid form options.
 */
const ARCHITECTURAL_STYLE_MAP: Record<string, string> = {
  'baroque': 'Baroque',
  'neo-gothic': 'Neo-Gothic',
  'neogothic': 'Neo-Gothic',
  'neo gothic': 'Neo-Gothic',
  'gothic': 'Neo-Gothic',
  'byzantine': 'Byzantine',
  'neo-classical': 'Neo-Classical',
  'neoclassical': 'Neo-Classical',
  'neo classical': 'Neo-Classical',
  'modern': 'Modern',
  'mixed styles': 'Mixed Styles',
  'mixed': 'Mixed Styles',
  'other': 'Other',
};

const normalizeArchitecturalStyle = (raw: string): string => {
  const lower = raw.toLowerCase().trim();
  if (ARCHITECTURAL_STYLE_MAP[lower]) return ARCHITECTURAL_STYLE_MAP[lower];
  for (const [key, val] of Object.entries(ARCHITECTURAL_STYLE_MAP)) {
    if (lower.includes(key)) return val;
  }
  const matched = Object.keys(ARCHITECTURAL_STYLE_MAP).filter((k) => lower.includes(k));
  if (matched.length > 1) return 'Mixed Styles';
  return raw.trim();
};

const HERITAGE_CLASSIFICATION_MAP: Record<string, string> = {
  'none': 'None',
  'national cultural treasure': 'National Cultural Treasures',
  'national cultural treasures': 'National Cultural Treasures',
  'nct': 'National Cultural Treasures',
  'important cultural property': 'Important Cultural Properties',
  'important cultural properties': 'Important Cultural Properties',
  'icp': 'Important Cultural Properties',
};

const normalizeHeritageClassification = (raw: string): string => {
  const lower = raw.toLowerCase().trim();
  if (HERITAGE_CLASSIFICATION_MAP[lower]) return HERITAGE_CLASSIFICATION_MAP[lower];
  for (const [key, val] of Object.entries(HERITAGE_CLASSIFICATION_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw.trim();
};

const RELIGIOUS_CLASSIFICATION_OPTIONS = [
  'Diocesan Shrine', 'Jubilee Church', 'Papal Basilica Affinity', 'Holy Door'
];

const parseReligiousClassifications = (raw: string): string[] => {
  const lower = raw.toLowerCase();
  return RELIGIOUS_CLASSIFICATION_OPTIONS.filter(
    (opt) => lower.includes(opt.toLowerCase())
  );
};

/**
 * Parse mass schedule text into structured MassSchedule objects.
 * Handles formats like:
 *   "Sunday 7:00 AM, 9:00 AM; Saturday 5:30 PM"
 *   "Sunday: 6:00 AM - 7:00 AM, 9:00 AM - 10:00 AM"
 *   "Mon-Fri 6:00 AM"
 */
const parseMassSchedules = (raw: string): MassSchedule[] => {
  const schedules: MassSchedule[] = [];
  // Split on semicolons or newlines to get per-day entries
  const entries = raw.split(/[;\n]/).map(s => s.trim()).filter(Boolean);

  const dayAliases: Record<string, string> = {
    'sun': 'Sunday', 'sunday': 'Sunday',
    'mon': 'Monday', 'monday': 'Monday',
    'tue': 'Tuesday', 'tues': 'Tuesday', 'tuesday': 'Tuesday',
    'wed': 'Wednesday', 'wednesday': 'Wednesday',
    'thu': 'Thursday', 'thurs': 'Thursday', 'thursday': 'Thursday',
    'fri': 'Friday', 'friday': 'Friday',
    'sat': 'Saturday', 'saturday': 'Saturday',
    'weekdays': 'Weekdays', 'weekday': 'Weekdays',
    'daily': 'Daily',
  };

  const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/g;

  for (const entry of entries) {
    // Try to find a day name at the start
    const dayMatch = entry.match(/^([A-Za-z-]+)[:\s,]+(.+)$/i);
    let day = '';
    let rest = entry;
    if (dayMatch) {
      const dayKey = dayMatch[1].toLowerCase().replace(/-/g, '');
      if (dayAliases[dayKey]) {
        day = dayAliases[dayKey];
        rest = dayMatch[2];
      } else {
        // Try multi-word day like "Mon-Fri"
        const parts = dayMatch[1].split('-');
        if (parts.length === 2 && dayAliases[parts[0].toLowerCase()] && dayAliases[parts[1].toLowerCase()]) {
          day = `${dayAliases[parts[0].toLowerCase()]}-${dayAliases[parts[1].toLowerCase()]}`;
          rest = dayMatch[2];
        }
      }
    }

    // Extract all times from the rest
    const times = [...rest.matchAll(timeRegex)].map(m => m[1].trim());
    if (times.length > 0 && day) {
      for (const time of times) {
        schedules.push({ day, time, endTime: '' });
      }
    } else if (day && rest.trim()) {
      // Could not parse times, store raw
      schedules.push({ day, time: rest.trim(), endTime: '' });
    }
  }

  return schedules;
};

/**
 * Validate extracted values and compute dynamic confidence scores.
 * Returns the (possibly transformed) value and its confidence.
 */
const validateAndScore = (
  path: string,
  value: unknown
): { value: unknown; confidence: number } => {
  const str = typeof value === 'string' ? value : '';

  switch (path) {
    case 'parishName':
    case 'churchName': {
      // Flag if value looks like it contains address fragments
      const addressPatterns = /\b(bohol|cebu|leyte|street|st\.|brgy\.|barangay|province|philippines)\b/i;
      if (addressPatterns.test(str)) return { value: str, confidence: 0.4 };
      if (str.length < 3) return { value: str, confidence: 0.3 };
      if (str.length > 200) return { value: str, confidence: 0.4 };
      return { value: str, confidence: 0.85 };
    }

    case 'historicalDetails.foundingYear': {
      // Extract a 4-digit year
      const yearMatch = str.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        const currentYear = new Date().getFullYear();
        if (year >= 1521 && year <= currentYear) return { value: String(year), confidence: 0.95 };
        return { value: String(year), confidence: 0.5 };
      }
      // Value present but no parseable year
      return { value: str, confidence: 0.3 };
    }

    case 'historicalDetails.heritageClassification': {
      const validValues = ['National Cultural Treasures', 'Important Cultural Properties', 'None'];
      if (validValues.includes(str)) return { value: str, confidence: 0.95 };
      return { value: str, confidence: 0.4 };
    }

    case 'historicalDetails.architecturalStyle': {
      const validStyles = ['Baroque', 'Neo-Gothic', 'Byzantine', 'Neo-Classical', 'Modern', 'Mixed Styles', 'Other'];
      if (validStyles.includes(str)) return { value: str, confidence: 0.9 };
      return { value: str, confidence: 0.5 };
    }

    case 'contactInfo.email': {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return { value: str, confidence: 0.9 };
      return { value: str, confidence: 0.3 };
    }

    case 'contactInfo.phone': {
      const digits = str.replace(/[^0-9]/g, '');
      if (digits.length >= 7) return { value: str, confidence: 0.85 };
      return { value: str, confidence: 0.4 };
    }

    case 'historicalDetails.historicalBackground':
    case 'historicalDetails.architecturalFeatures':
    case 'historicalDetails.heritageInformation': {
      if (str.length > 100) return { value: str, confidence: 0.85 };
      if (str.length > 30) return { value: str, confidence: 0.7 };
      return { value: str, confidence: 0.5 };
    }

    case 'massSchedules': {
      if (Array.isArray(value) && value.length > 0) return { value, confidence: 0.8 };
      return { value, confidence: 0.4 };
    }

    default:
      return { value, confidence: 0.7 };
  }
};

/** @internal Exported for testing */
export const buildParsedDataFromText = (text: string) => {
  const fieldValues = preprocessText(text);
  const parsedData: Partial<ChurchInfo> = {};
  const confidence: Record<string, number> = {};

  const fieldMap: Array<{ path: string; labels: string[]; transform?: (v: string) => unknown }> = [
    { path: 'parishName', labels: ['parish name', 'parish'] },
    { path: 'churchName', labels: ['church name', 'church'] },
    { path: 'locationDetails.streetAddress', labels: ['street address', 'address'] },
    { path: 'locationDetails.barangay', labels: ['barangay'] },
    { path: 'locationDetails.municipality', labels: ['municipality', 'city', 'town'] },
    { path: 'locationDetails.province', labels: ['province'] },
    { path: 'currentParishPriest', labels: ['current parish priest', 'parish priest', 'current priest', 'priest', 'parish administrator'] },
    { path: 'feastDay', labels: ['feast day', 'patron feast day'] },
    { path: 'historicalDetails.foundingYear', labels: ['founding year', 'year founded', 'year established', 'year built', 'date established', 'date founded', 'construction year', 'founded'] },
    { path: 'historicalDetails.founders', labels: ['founders', 'founded by', 'founding organization'] },
    { path: 'historicalDetails.architecturalStyle', labels: ['architectural style', 'architecture'], transform: normalizeArchitecturalStyle },
    { path: 'historicalDetails.heritageClassification', labels: ['heritage classification', 'heritage class'], transform: normalizeHeritageClassification },
    { path: 'historicalDetails.religiousClassifications', labels: ['religious classification', 'religious class'], transform: (v) => { const arr = parseReligiousClassifications(v); return arr.length > 0 ? arr : undefined; } },
    { path: 'historicalDetails.historicalBackground', labels: ['historical background', 'church history', 'history'] },
    { path: 'historicalDetails.architecturalFeatures', labels: ['architectural information', 'architectural features', 'design features', 'building features', 'notable features'] },
    { path: 'historicalDetails.heritageInformation', labels: ['heritage information', 'heritage details', 'heritage status', 'cultural significance'] },
    { path: 'contactInfo.phone', labels: ['contact phone', 'contact number', 'contact #', 'phone', 'telephone', 'mobile number', 'mobile', 'tel'] },
    { path: 'contactInfo.email', labels: ['contact email', 'email'] },
    { path: 'contactInfo.website', labels: ['official website', 'website'] },
    { path: 'contactInfo.facebookPage', labels: ['facebook page', 'facebook'] },
    { path: 'massSchedules', labels: ['mass schedules', 'mass schedule', 'schedule of masses', 'worship schedule'], transform: (v) => { const arr = parseMassSchedules(v); return arr.length > 0 ? arr : undefined; } }
  ];

  fieldMap.forEach(({ path, labels, transform }) => {
    for (const label of labels) {
      const raw = fieldValues.get(label);
      if (raw) {
        const value = transform ? transform(raw) : raw;
        if (value !== undefined && value !== '') {
          const validated = validateAndScore(path, value);
          if (validated.value !== undefined && validated.value !== '') {
            setNestedValue(parsedData as Record<string, any>, path, validated.value);
            confidence[path] = validated.confidence;
          }
        }
        break;
      }
    }
  });

  return { parsedData, confidence };
};

const convertImportSnapshot = (snapshot: { id: string; data: () => Record<string, any> }): ChurchImportSession => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    churchId: data.churchId,
    diocese: data.diocese,
    createdBy: data.createdBy,
    status: data.status,
    sourceFile: data.sourceFile,
    parsedData: data.parsedData,
    confidence: data.confidence,
    sourceSnippets: data.sourceSnippets,
    errorMessage: data.errorMessage,
    appliedAt: data.appliedAt?.toDate?.() || data.appliedAt,
    appliedBy: data.appliedBy,
    appliedFields: data.appliedFields || [],
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
  } as ChurchImportSession;
};

export class ChurchImportService {
  static getMaxUploadBytes() {
    return MAX_UPLOAD_MB * 1024 * 1024;
  }

  static async createImportSession({
    file,
    churchId,
    diocese,
    createdBy,
    onProgress
  }: {
    file: File;
    churchId: string;
    diocese?: string;
    createdBy: string;
    onProgress?: (progress: UploadProgress) => void;
  }): Promise<ChurchImportSession> {
    if (!churchId) {
      throw new Error('A church must be saved before importing documents.');
    }

    if (file.size > ChurchImportService.getMaxUploadBytes()) {
      throw new Error(`File exceeds ${MAX_UPLOAD_MB}MB limit.`);
    }

    // Force-refresh the auth token to prevent expired-token 403 errors
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }

    console.log(`📄 Import upload: name=${file.name}, type="${file.type}", size=${file.size}`);

    const folder = `churches/${churchId}/imports`;
    const filename = `${Date.now()}_${file.name}`;
    const storagePath = `${folder}/${filename}`;
    const fileUrl = await uploadService.uploadFile(file, {
      folder,
      filename,
      metadata: {
        churchId,
        diocese: diocese || 'unknown',
        importType: 'church_profile',
        originalName: file.name
      },
      onProgress
    });

    // Store in subcollection: churches/{churchId}/import_sessions/{auto-id}
    const docRef = await addDoc(importSessionsCollection(churchId), {
      churchId,
      diocese: diocese || null,
      createdBy,
      status: 'queued',
      sourceFile: {
        url: fileUrl,
        name: file.name,
        contentType: file.type,
        size: file.size,
        storagePath
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const snapshot = await getDoc(docRef);
    return convertImportSnapshot({ id: snapshot.id, data: () => snapshot.data() || {} });
  }

  static subscribeToImportSession(churchId: string, importId: string, onUpdate: (session: ChurchImportSession | null) => void): Unsubscribe {
    const docRef = importSessionDoc(churchId, importId);
    return onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(convertImportSnapshot({ id: snapshot.id, data: () => snapshot.data() || {} }));
    });
  }

  static async startImportProcessing(churchId: string, importId: string, file: File): Promise<void> {
    const docRef = importSessionDoc(churchId, importId);
    await updateDoc(docRef, {
      status: 'processing',
      updatedAt: serverTimestamp()
    });

    if (isTextFile(file)) {
      const text = await file.text();
      const { parsedData, confidence } = buildParsedDataFromText(text);
      await updateDoc(docRef, {
        status: 'ready',
        parsedData,
        confidence,
        updatedAt: serverTimestamp()
      });
      return;
    }

    try {
      const parseFn = httpsCallable(functions, 'parseChurchImport');
      await parseFn({ importId, churchId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start parsing.';
      await updateDoc(docRef, {
        status: 'failed',
        errorMessage: message,
        updatedAt: serverTimestamp()
      });
      throw error;
    }
  }

  static async markImportApplied(churchId: string, importId: string, appliedBy: string, appliedFields: string[]) {
    const docRef = importSessionDoc(churchId, importId);
    await updateDoc(docRef, {
      appliedAt: Timestamp.now(),
      appliedBy,
      appliedFields,
      updatedAt: serverTimestamp()
    });
  }
}
