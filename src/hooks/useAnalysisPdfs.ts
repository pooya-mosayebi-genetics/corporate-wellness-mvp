import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePdfBlob, loadPdfBlob, deletePdfBlob, downloadPdf } from '../services/pdfStore';

export interface AnalysisPdf {
  id: string;
  fileName: string;
  sizeKb: number;
  storageKey: string;
  uploadedAt: string;
}

const KEY = 'analysis_pdfs_v1';

/**
 * PDFهای گزارش بادی‌آنالیز کاربر.
 * فایل در IndexedDB و متادیتا در AsyncStorage (MVP دستگاه-محلی؛
 * در فاز بک‌اند با Storage سروری جایگزین می‌شود).
 */
export function useAnalysisPdfs() {
  const [pdfs, setPdfs] = useState<AnalysisPdf[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<AnalysisPdf[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const list = JSON.parse(raw) as AnalysisPdf[];
          ref.current = list;
          setPdfs(list);
        }
      } catch {
        // ignore
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next: AnalysisPdf[]) => {
    ref.current = next;
    setPdfs(next);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const addPdf = useCallback(
    async (blob: Blob, fileName: string): Promise<AnalysisPdf> => {
      const id = `apdf-${Date.now()}`;
      const storageKey = `pdf-${id}`;
      await savePdfBlob(storageKey, blob);
      const meta: AnalysisPdf = {
        id,
        fileName,
        sizeKb: Math.round(blob.size / 1024),
        storageKey,
        uploadedAt: new Date().toISOString(),
      };
      await persist([meta, ...ref.current]);
      return meta;
    },
    [persist],
  );

  const removePdf = useCallback(
    async (id: string) => {
      const target = ref.current.find((p) => p.id === id);
      if (target) await deletePdfBlob(target.storageKey);
      await persist(ref.current.filter((p) => p.id !== id));
    },
    [persist],
  );

  /** باز کردن PDF در تب جدید (نمایشگر PDF مرورگر) */
  const viewPdf = useCallback(async (meta: AnalysisPdf): Promise<boolean> => {
    const blob = await loadPdfBlob(meta.storageKey);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    if (typeof window !== 'undefined') window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  }, []);

  const download = useCallback(
    (meta: AnalysisPdf) => downloadPdf(meta.storageKey, meta.fileName),
    [],
  );

  return { pdfs, loaded, addPdf, removePdf, viewPdf, download };
}