import { get, set, del } from 'idb-keyval';

/** ذخیرهٔ فایل PDF در IndexedDB */
export async function savePdfBlob(key: string, blob: Blob): Promise<void> {
  await set(key, blob);
}

export async function loadPdfBlob(key: string): Promise<Blob | null> {
  try {
    const blob = await get<Blob>(key);
    return blob ?? null;
  } catch {
    return null;
  }
}

export async function deletePdfBlob(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    // ignore
  }
}

/** دانلود فایل در مرورگر */
export async function downloadPdf(key: string, fileName: string): Promise<boolean> {
  const blob = await loadPdfBlob(key);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}