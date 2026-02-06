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
import uploadService, { type UploadProgress } from '@/services/uploadService';
import type { ChurchInfo, ChurchImportSession } from '@/components/parish/types';

const CHURCH_IMPORTS_COLLECTION = 'church_imports';
const MAX_UPLOAD_MB = 20;

const isTextFile = (file: File) => {
  if (file.type.startsWith('text/')) return true;
  return /\.(txt|md|csv)$/i.test(file.name);
};

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const findLineValue = (lines: string[], labels: string[]) => {
  const lowerLabels = labels.map(label => label.toLowerCase());
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    const lower = cleanLine.toLowerCase();
    for (const label of lowerLabels) {
      if (lower.startsWith(label.toLowerCase())) {
        const separatorIndex = cleanLine.indexOf(':');
        if (separatorIndex >= 0) {
          const value = cleanLine.slice(separatorIndex + 1);
          return normalizeWhitespace(value);
        }
        const parts = cleanLine.split('-');
        if (parts.length > 1) {
          return normalizeWhitespace(parts.slice(1).join('-'));
        }
      }
    }
  }
  return '';
};

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

const buildParsedDataFromText = (text: string) => {
  const lines = text.split(/\r?\n/);
  const parsedData: Partial<ChurchInfo> = {};
  const confidence: Record<string, number> = {};

  const fieldMap: Array<{ path: string; labels: string[] }> = [
    { path: 'parishName', labels: ['Parish Name', 'Parish'] },
    { path: 'churchName', labels: ['Church Name', 'Church'] },
    { path: 'locationDetails.streetAddress', labels: ['Street Address', 'Address'] },
    { path: 'locationDetails.barangay', labels: ['Barangay'] },
    { path: 'locationDetails.municipality', labels: ['Municipality', 'City', 'Town'] },
    { path: 'locationDetails.province', labels: ['Province'] },
    { path: 'currentParishPriest', labels: ['Parish Priest', 'Current Parish Priest', 'Priest'] },
    { path: 'feastDay', labels: ['Feast Day', 'Patron Feast Day'] },
    { path: 'historicalDetails.foundingYear', labels: ['Founding Year', 'Founded'] },
    { path: 'historicalDetails.architecturalStyle', labels: ['Architectural Style', 'Architecture'] },
    { path: 'historicalDetails.historicalBackground', labels: ['Historical Background', 'History'] },
    { path: 'historicalDetails.majorHistoricalEvents', labels: ['Major Historical Events', 'Historical Events'] },
    { path: 'contactInfo.phone', labels: ['Phone', 'Contact Phone', 'Telephone'] },
    { path: 'contactInfo.email', labels: ['Email', 'Contact Email'] },
    { path: 'contactInfo.website', labels: ['Website', 'Official Website'] },
    { path: 'contactInfo.facebookPage', labels: ['Facebook', 'Facebook Page'] }
  ];

  fieldMap.forEach(({ path, labels }) => {
    const value = findLineValue(lines, labels);
    if (value) {
      setNestedValue(parsedData as Record<string, any>, path, value);
      confidence[path] = 0.7;
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
