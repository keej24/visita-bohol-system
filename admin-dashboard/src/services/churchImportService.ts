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
import type { ChurchInfo, ChurchImportSession } from '@/components/parish/types';

const CHURCH_IMPORTS_COLLECTION = 'church_imports';
const MAX_UPLOAD_MB = 20;

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
  'Parish Name', 'Church Name',
  'Location Details', 'Street Address', 'Address',
  'Barangay', 'Municipality', 'City', 'Town', 'Province',
  'Current Parish Priest', 'Parish Priest', 'Current Priest', 'Priest',
  'Feast Day', 'Patron Feast Day',
  'Founding Year', 'Year Founded', 'Year Established', 'Founded',
  'Founders', 'Founded By', 'Founding Organization',
  'Architectural Style', 'Architecture',
  'Heritage Classification', 'Heritage Class',
  'Religious Classification', 'Religious Class',
  'Historical Background', 'Historical background', 'Church History', 'History',
  'Architectural Information', 'Architectural Features', 'Design Features', 'Building Features', 'Notable Features',
  'Heritage Information', 'Heritage Details', 'Heritage Status', 'Cultural Significance',
  'Contact Phone', 'Contact #', 'Phone', 'Telephone',
  'Contact Email', 'Email',
  'Official Website', 'Website',
  'Facebook Page', 'Facebook',
  'Mass Schedules', 'Mass Schedule'
].sort((a, b) => b.length - a.length);

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
      // Continuation line — append to current value
      const trimmed = line.trim();
      if (trimmed) {
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

const buildParsedDataFromText = (text: string) => {
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
    { path: 'currentParishPriest', labels: ['current parish priest', 'parish priest', 'current priest', 'priest'] },
    { path: 'feastDay', labels: ['feast day', 'patron feast day'] },
    { path: 'historicalDetails.foundingYear', labels: ['founding year', 'year founded', 'year established', 'founded'] },
    { path: 'historicalDetails.founders', labels: ['founders', 'founded by', 'founding organization'] },
    { path: 'historicalDetails.architecturalStyle', labels: ['architectural style', 'architecture'], transform: normalizeArchitecturalStyle },
    { path: 'historicalDetails.heritageClassification', labels: ['heritage classification', 'heritage class'], transform: normalizeHeritageClassification },
    { path: 'historicalDetails.religiousClassifications', labels: ['religious classification', 'religious class'], transform: (v) => { const arr = parseReligiousClassifications(v); return arr.length > 0 ? arr : undefined; } },
    { path: 'historicalDetails.historicalBackground', labels: ['historical background', 'church history', 'history'] },
    { path: 'historicalDetails.architecturalFeatures', labels: ['architectural information', 'architectural features', 'design features', 'building features', 'notable features'] },
    { path: 'historicalDetails.heritageInformation', labels: ['heritage information', 'heritage details', 'heritage status', 'cultural significance'] },
    { path: 'contactInfo.phone', labels: ['contact phone', 'contact #', 'phone', 'telephone'] },
    { path: 'contactInfo.email', labels: ['contact email', 'email'] },
    { path: 'contactInfo.website', labels: ['official website', 'website'] },
    { path: 'contactInfo.facebookPage', labels: ['facebook page', 'facebook'] }
  ];

  fieldMap.forEach(({ path, labels, transform }) => {
    for (const label of labels) {
      const raw = fieldValues.get(label);
      if (raw) {
        const value = transform ? transform(raw) : raw;
        if (value !== undefined && value !== '') {
          setNestedValue(parsedData as Record<string, any>, path, value);
          confidence[path] = 0.7;
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
    churchId?: string;
    diocese?: string;
    createdBy: string;
    onProgress?: (progress: UploadProgress) => void;
  }): Promise<ChurchImportSession> {
    if (file.size > ChurchImportService.getMaxUploadBytes()) {
      throw new Error(`File exceeds ${MAX_UPLOAD_MB}MB limit.`);
    }

    // Force-refresh the auth token to prevent expired-token 403 errors
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }

    console.log(`📄 Import upload: name=${file.name}, type="${file.type}", size=${file.size}`);

    const folder = churchId ? `churches/${churchId}/imports` : `churches/draft_${createdBy}/imports`;
    const filename = `${Date.now()}_${file.name}`;
    const storagePath = `${folder}/${filename}`;
    const fileUrl = await uploadService.uploadFile(file, {
      folder,
      filename,
      metadata: {
        churchId: churchId || 'draft',
        diocese: diocese || 'unknown',
        importType: 'church_profile',
        originalName: file.name
      },
      onProgress
    });

    const docRef = await addDoc(collection(db, CHURCH_IMPORTS_COLLECTION), {
      churchId: churchId || null,
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

  static subscribeToImportSession(id: string, onUpdate: (session: ChurchImportSession | null) => void): Unsubscribe {
    const docRef = doc(db, CHURCH_IMPORTS_COLLECTION, id);
    return onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(convertImportSnapshot({ id: snapshot.id, data: () => snapshot.data() || {} }));
    });
  }

  static async startImportProcessing(importId: string, file: File): Promise<void> {
    const docRef = doc(db, CHURCH_IMPORTS_COLLECTION, importId);
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
      await parseFn({ importId });
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

  static async markImportApplied(importId: string, appliedBy: string, appliedFields: string[]) {
    const docRef = doc(db, CHURCH_IMPORTS_COLLECTION, importId);
    await updateDoc(docRef, {
      appliedAt: Timestamp.now(),
      appliedBy,
      appliedFields,
      updatedAt: serverTimestamp()
    });
  }
}
