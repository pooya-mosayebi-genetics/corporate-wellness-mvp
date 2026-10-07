import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  app: string;
  entries: Record<string, string>;
}

/** خروجی کامل از همهٔ کلیدهای محلی */
export async function createBackup(): Promise<BackupPayload> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  const entries: Record<string, string> = {};
  pairs.forEach(([k, v]) => { if (v != null) entries[k] = v; });
  return { version: 1, exportedAt: new Date().toISOString(), app: 'zharfa-wellness', entries };
}

/** بازیابی کامل از یک فایل بک‌آپ */
export async function restoreBackup(payload: BackupPayload): Promise<{ restored: number }> {
  const entries = Object.entries(payload?.entries || {});
  if (!entries.length) return { restored: 0 };
  await AsyncStorage.multiSet(entries);
  return { restored: entries.length };
}

/** دانلود فایل JSON (وب) */
export function downloadBackupJson(payload: BackupPayload, filename?: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `zharfa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** خواندن فایل بک‌آپ (وب) */
export async function readBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text();
  return JSON.parse(text);
}