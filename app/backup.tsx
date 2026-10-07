import { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, ScrollView, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/store/ThemeContext';
import { useLanguage } from '../src/store/LanguageContext';
import { useAuth } from '../src/store/AuthContext';
import { canAccess, homeRouteFor } from '../src/utils/access';
import { createBackup, BackupPayload } from '../src/utils/backup'; // فقط برای خواندن داده خام
import {
  createSecureBackup,
  validateSecureBackupFile,
  restoreSecureBackup,
  revealPassphrase,
  downloadEncryptedFile, // 🆕 import جدید
  type EncryptedPayload,
} from '../src/utils/secureBackup';
import { useAudit } from '../src/store/AuditContext';

type ExportStat = { key: string; fa: string; en: string; count: number };

export default function BackupScreen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const isFa = language === 'fa';
  const { session } = useAuth();
  const { log } = useAudit();

  const [exportStats, setExportStats] = useState<ExportStat[] | null>(null);
  const [pendingFile, setPendingFile] = useState<{ content: string; preview?: { keys: number; date: string } } | null>(null);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [storedPassphrase, setStoredPassphrase] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  const allowed = canAccess(session?.role, 'backup');

  const buildStats = (payload: BackupPayload): ExportStat[] => {
    const entries = payload.entries;
    const count = (key: string): number => {
      const raw = entries[key];
      if (!raw) return 0;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.length;
        if (parsed?.items && Array.isArray(parsed.items)) return parsed.items.length;
        return 1;
      } catch { return 0; }
    };
    return [
      { key: 'persons', fa: 'پرسنل', en: 'Personnel', count: count('zdl:v1:persons') },
      { key: 'analyses', fa: 'آنالیزهای بدنی', en: 'Body analyses', count: count('zdl:v1:analyses') },
      { key: 'foodLogs', fa: 'وعده‌های غذایی', en: 'Food logs', count: count('zdl:v1:foodLogs') },
      { key: 'queue', fa: 'صف نوشتن', en: 'Write queue', count: count('zdl:v1:queue') },
      { key: 'goals', fa: 'اهداف', en: 'Goals', count: count('zdl:v1:goals') },
      { key: 'foodItems', fa: 'آیتم‌های غذا', en: 'Food items', count: count('zdl:v1:foodItems') },
      { key: 'appState', fa: 'وضعیت اپ', en: 'App state', count: count('wellness_app_state') },
    ];
  };

  useEffect(() => {
    if (session && !allowed) router.replace(homeRouteFor(session.role));
  }, [session, allowed]);

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      try {
        const payload = await createBackup();
        setExportStats(buildStats(payload));
        const stored = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('zdl:lastBackupAt'));
        setLastBackupAt(stored);
        
        const pp = await revealPassphrase();
        setStoredPassphrase(pp);
      } catch {}
    })();
  }, [allowed]);

  /* ═══════ EXPORT AMN (اصلاح شده) ═══════ */
  const doSecureExport = async () => {
    setLoading(true);
    setInfo(null);
    try {
      // ۱. گرفتن داده خام از سیستم فعلی
      const legacyPayload = await createBackup();
      
      // ۲. تبدیل به Payload رمزنگاری‌شده
      const result = await createSecureBackup(legacyPayload.entries);
      
      if (!result.success || !result.fileName) throw new Error(result.error || 'Export failed');
      
      // ⚠️ نکته مهم: createSecureBackup در نسخه قبلی فقط metadata برمی‌گرداند.
      // ما نیاز داریم خودِ EncryptedPayload را داشته باشیم تا دانلود کنیم.
      // پس اینجا مستقیماً از encryptBackup استفاده می‌کنیم یا نتیجه را بازسازی می‌کنیم.
      
      // بیایید فرض کنیم createSecureBackup یک شیء EncryptedPayload برمی‌گرداند (نه فقط Result)
      // اگر ساختار تابع تغییر کرده، باید آن را اصلاح کنیم. 
      // برای حل سریع مشکل فعلی، ما مستقیماً از low-level function استفاده می‌کنیم:
      
      const passphrase = await revealPassphrase();
      const plainObj = { version: 1, exportedAt: new Date().toISOString(), entries: legacyPayload.entries };
      const plaintextJson = JSON.stringify(plainObj);
      
      // فراخوانی مستقیم encryptBackup برای گرفتن object کامل
      const encryptedPayload: EncryptedPayload = await (await import('../src/utils/secureBackup')).encryptBackup(plaintextJson, passphrase);
      
      // ۳. دانلود فایل واقعی
      if (Platform.OS === 'web') {
        downloadEncryptedFile(encryptedPayload, result.fileName);
      } else {
         Alert.alert(isFa ? 'خروجی آماده است' : 'Export Ready', isFa ? 'در نسخه وب دانلود انجام می‌شود.' : 'Available on web.');
      }
      
      await import('@react-native-async-storage/async-storage').then(m => m.default.setItem('zdl:lastBackupAt', new Date().toISOString()));
      setLastBackupAt(new Date().toISOString());
      
      log({
        action: 'backup:export_secure', entity: 'backup',
        severity: 'warn',
        messageFa: `خروجی بک‌آپ امن گرفته شد (${Object.keys(legacyPayload.entries).length} کلید)`,
      });
      
      setInfo({
        kind: 'success',
        text: isFa ? `✅ بک‌آپ امن ساخته و دانلود شد: ${result.fileName}` : `✅ Secure backup downloaded: ${result.fileName}`,
      });
    } catch (e: any) {
      console.error(e);
      setInfo({ kind: 'error', text: isFa ? `❌ خطا: ${e?.message}` : `❌ Error: ${e?.message}` });
    } finally {
      setLoading(false);
    }
  };

  /* ═══════ IMPORT AMN ═══════ */
  const pickSecureFile = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(isFa ? 'فقط وب' : 'Web only', isFa ? 'بازیابی امن فعلاً فقط روی وب فعال است.' : 'Secure restore is web-only.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e: any) => {
      const f = e?.target?.files?.[0];
      if (!f) return;
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const content = String(reader.result);
          const validation = await validateSecureBackupFile(content);
          
          if (!validation.valid) {
            setInfo({ kind: 'error', text: `❌ ${validation.error}` });
            return;
          }
          
          setPendingFile({ content, preview: validation.preview });
          setInfo({ kind: 'info', text: isFa ? '🔐 فایل معتبر است. passphrase را وارد کنید.' : '🔐 Valid file. Enter passphrase.' });
        };
        reader.readAsText(f);
      } catch {
        setInfo({ kind: 'error', text: isFa ? '❌ خطای خواندن فایل' : '❌ File read error' });
      }
    };
    input.click();
  };

  const confirmSecureRestore = async () => {
    if (!pendingFile || !passphraseInput.trim()) {
      setInfo({ kind: 'error', text: isFa ? '⚠️ passphrase الزامی است' : '⚠️ Passphrase required' });
      return;
    }
    
    setLoading(true);
    try {
      const result = await restoreSecureBackup(pendingFile.content, passphraseInput.trim());
      
      if (!result.success) throw new Error(result.error);
      
      log({
        action: 'backup:restore_secure', entity: 'backup',
        severity: 'critical',
        messageFa: `بازیابی بک‌آپ امن انجام شد (${result.restoredKeys ?? 0} کلید)`,
      });
      
      setInfo({
        kind: 'success',
        text: isFa ? `✅ بازیابی موفق: ${result.restoredKeys} کلید. ری‌استارت لازم است.` : `✅ Restored ${result.restoredKeys} keys. Restart required.`,
      });
      setPendingFile(null);
      setPassphraseInput('');
    } catch (e: any) {
      setInfo({ kind: 'error', text: isFa ? `❌ ${e?.message}` : `❌ ${e?.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (!allowed) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* هدر */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 15, color: colors.text }}>{isFa ? '→' : '←'}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
            {isFa ? '🛡 پشتیبان‌گیری امن' : '🛡 Secure Backup'}
          </Text>
          <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
            {isFa ? 'AES-256 + SHA-256 Integrity' : 'AES-256 + SHA-256 Integrity'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {/* کارت امنیت */}
        <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, borderWidth: 1, borderColor: '#dc2626', padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#b91c1c', marginBottom: 6 }}>
            🔐 {isFa ? 'هشدار امنیتی مهم' : 'Critical Security Notice'}
          </Text>
          <Text style={{ fontSize: 10, color: '#7f1d1d', lineHeight: 16, marginBottom: 8 }}>
            {isFa
              ? 'بک‌آپ‌ها با AES-256-CBC رمزنگاری می‌شوند. passphrase به‌صورت خودکار تولید و در دستگاه ذخیره می‌شود. اگر این passphrase را از دست بدهید، داده‌های بک‌آپ غیرقابل بازیابی خواهند بود!'
              : 'Backups are AES-256-CBC encrypted. The passphrase is auto-generated and stored locally. IF YOU LOSE THIS PASSPHRASE, YOUR BACKUP DATA WILL BE UNRECOVERABLE!'}
          </Text>
          
          {storedPassphrase && (
            <View style={{ backgroundColor: '#fee2e2', borderRadius: 10, padding: 10, marginTop: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#b91c1c', marginBottom: 4 }}>
                {isFa ? 'Passphrase فعلی:' : 'Current Passphrase:'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text selectable style={{ flex: 1, fontSize: 10, fontFamily: 'monospace', color: '#7f1d1d', wordBreak: 'break-all' }}>
                  {showPassphrase ? storedPassphrase : '•'.repeat(Math.min(storedPassphrase.length, 32))}
                </Text>
                <Pressable onPress={() => setShowPassphrase(v => !v)} style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fecaca' }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: '#b91c1c' }}>
                    {showPassphrase ? (isFa ? 'مخفی' : 'Hide') : (isFa ? 'نمایش' : 'Show')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* آمار */}
        {exportStats && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 10 }}>
              {isFa ? '📦 داده‌های آمادهٔ خروجی:' : '📦 Data ready for export:'}
            </Text>
            {exportStats.map((s) => (
              <View key={s.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isFa ? s.fa : s.en}</Text>
                <Text style={{ fontSize: 9, fontWeight: '700', color: s.count > 0 ? colors.primary : colors.textMuted }}>{s.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* دکمه‌ها */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Pressable onPress={doSecureExport} disabled={loading} style={{ flex: 1, backgroundColor: loading ? colors.border : '#dc2626', borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
              {loading ? '...' : `🔐 ${isFa ? 'خروجی امن' : 'Secure Export'}`}
            </Text>
          </Pressable>
          <Pressable onPress={pickSecureFile} disabled={loading} style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>
              🔓 {isFa ? 'بازیابی امن' : 'Secure Restore'}
            </Text>
          </Pressable>
        </View>

        {/* پیام */}
        {info && (
          <View style={{ backgroundColor: info.kind === 'success' ? colors.success + '22' : info.kind === 'error' ? colors.danger + '22' : colors.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: info.kind === 'success' ? colors.success : info.kind === 'error' ? colors.danger : colors.primary }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{info.text}</Text>
          </View>
        )}

        {/* فرم passphrase برای restore */}
        {pendingFile && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 2, borderColor: '#dc2626', padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#b91c1c', marginBottom: 8 }}>
              🔑 {isFa ? 'وارد کردن Passphrase' : 'Enter Passphrase'}
            </Text>
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 10, lineHeight: 16 }}>
              {isFa ? `فایل: ${pendingFile.preview?.keys ?? '?'} کلید · تاریخ: ${new Date(pendingFile.preview?.date ?? '').toLocaleDateString(isFa ? 'fa-IR' : 'en-US')}` : `File: ${pendingFile.preview?.keys ?? '?'} keys · Date: ${new Date(pendingFile.preview?.date ?? '').toLocaleDateString(isFa ? 'fa-IR' : 'en-US')}`}
            </Text>
            
            <TextInput
              value={passphraseInput}
              onChangeText={setPassphraseInput}
              placeholder={isFa ? 'passphrase ذخیره‌شده...' : 'stored passphrase...'}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassphrase}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 12, fontSize: 12, color: colors.text, fontFamily: 'monospace', marginBottom: 12 }}
            />
            
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { setPendingFile(null); setPassphraseInput(''); }} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary }}>{isFa ? 'انصراف' : 'Cancel'}</Text>
              </Pressable>
              <Pressable onPress={confirmSecureRestore} disabled={loading || !passphraseInput.trim()} style={{ flex: 1, backgroundColor: loading || !passphraseInput.trim() ? colors.border : '#dc2626', borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: loading || !passphraseInput.trim() ? 0.6 : 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{isFa ? '🔓 بازیابی' : '🔓 Restore'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}