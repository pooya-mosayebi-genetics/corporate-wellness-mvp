/** ساخت/خواندن/دانلود فایل پشتیبان JSON */

export function buildBackup(state: any): string {
  return JSON.stringify({ app: 'the-min-wellness', version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function buildPersonalBackup(state: any): string {
  const { profile, targets, meals, waterEntries, bodyAnalyses } = state;
  return JSON.stringify({ app: 'the-min-wellness', scope: 'personal', version: 1, exportedAt: new Date().toISOString(), state: { profile, targets, meals, waterEntries, bodyAnalyses } }, null, 2);
}

export function downloadBackup(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function parseBackup(text: string): any {
  const obj = JSON.parse(text);
  return obj.state ?? obj;
}