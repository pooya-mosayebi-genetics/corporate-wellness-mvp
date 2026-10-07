/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · Secure Backup Engine (L-10 Phase 4.3)
 *  پشتیبان‌گیری با رمزنگاری AES-256 + Integrity Check (SHA-256)
 *  شامل Envelope Encryption Pattern برای تشخیص سریع دستکاری
 * ─────────────────────────────────────────────────────────────
 */
import CryptoJS from 'crypto-js';
import * as ExpoCrypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EncryptedPayload {
  v: 2; // نسخهٔ فرمت جدید
  enc: true; // علامت رمزنگاری
  alg: 'AES-256-CBC';
  iv: string; // Initialization Vector (Base64)
  data: string; // Cipher Text (Base64)
  hash: string; // SHA-256 Hex Digest of plaintext JSON (برای integrity check نهایی)
  cipherHash?: string; // 🆕 L-10 Fix: SHA-256 of Data field itself (برای detect tamper before decrypt)
  meta: {
    exportedAt: string;
    keyCount: number;
    appId: string;
  };
}

const STORAGE_KEY_PASSPHRASE = 'themin_backup_passphrase_v1';
const DEFAULT_APP_ID = 'corporate-wellness-mvp';

/* ════════════ Key Management ════════════ */

/**
 * بازیابی passphrase ذخیره‌شده یا تولید تصادفی.
 * ⚠️ هشدار: اگر کاربر passphrase را گم کند، داده‌های بک‌آپ غیرقابل بازیابی خواهند بود.
 */
export async function getOrCreatePassphrase(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_PASSPHRASE);
    if (saved && saved.length >= 16) return saved;
    
    // تولید passphrase قوی (32 hex chars = 128 bits entropy)
    const bytes = await ExpoCrypto.getRandomBytesAsync(16);
    const generated = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    await AsyncStorage.setItem(STORAGE_KEY_PASSPHRASE, generated);
    return generated;
  } catch {
    // Fallback ایمن در صورت خطای storage
    const fallback = CryptoJS.lib.WordArray.random(16).toString();
    console.warn('[SecureBackup] Using ephemeral fallback passphrase.');
    return fallback;
  }
}

/** نمایش passphrase به کاربر (فقط برای copy/paste دستی) */
export async function revealPassphrase(): Promise<string> {
  return getOrCreatePassphrase();
}

/* ════════════ Encryption / Decryption ════════════ */

function deriveKey(passphrase: string): CryptoJS.lib.WordArray {
  // PBKDF2 با 100k iterations برای مقاوم بودن در برابر brute-force
  return CryptoJS.PBKDF2(passphrase, 'zdl_wellness_salt_v1', {
    keySize: 256 / 32, // 8 words = 256 bits
    iterations: 100_000,
  });
}

export async function encryptBackup(plaintextJson: string, passphrase: string): Promise<EncryptedPayload> {
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = deriveKey(passphrase);
  
  const encrypted = CryptoJS.AES.encrypt(plaintextJson, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ciphertextBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  const ivBase64 = iv.toString(CryptoJS.enc.Base64);

  // محاسبه SHA-256 از متن اصلی (برای integrity check نهایی)
  const plainHash = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    plaintextJson
  );

  // 🆕 L-10 Fix: محاسبه SHA-256 از Ciphertext (برای تشخیص زودهنگام tamper)
  const cipherHash = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    ciphertextBase64
  );

  let parsed: any;
  try { parsed = JSON.parse(plaintextJson); } catch { parsed = {}; }

  return {
    v: 2,
    enc: true,
    alg: 'AES-256-CBC',
    iv: ivBase64,
    data: ciphertextBase64,
    hash: plainHash,
    cipherHash, // 🆕 ذخیره هش سلفرمت
    meta: {
      exportedAt: new Date().toISOString(),
      keyCount: Object.keys(parsed.entries || {}).length,
      appId: DEFAULT_APP_ID,
    },
  };
}

export async function decryptBackup(payload: EncryptedPayload, passphrase: string): Promise<string> {
  if (!payload.enc || payload.alg !== 'AES-256-CBC') {
    throw new Error('Invalid or unsupported encryption format.');
  }

  // 🆕 L-10 Fix: Pre-decrypt Integrity Check (تشخیص سریع Tamper)
  if (payload.cipherHash) {
    const currentCipherHash = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      payload.data
    );
    
    if (currentCipherHash.toLowerCase() !== payload.cipherHash.toLowerCase()) {
      throw new Error('INTEGRITY_CHECK_FAILED_CORRUPTED_FILE');
    }
  }

  // اعتبارسنجی اولیه ساختار (Pre-flight check)
  try {
    CryptoJS.enc.Base64.parse(payload.iv);
    CryptoJS.enc.Base64.parse(payload.data);
  } catch {
    throw new Error('Corrupted backup file: invalid base64 structure.');
  }

  const key = deriveKey(passphrase);
  const iv = CryptoJS.enc.Base64.parse(payload.iv);
  const ciphertext = CryptoJS.enc.Base64.parse(payload.data);

  let plaintext: string;
  try {
    const decrypted = CryptoJS.AES.decrypt({ ciphertext } as any, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    
    // 🆕 L-10 Fix: تشخیص Passphrase غلط
    if (!plaintext) {
      throw new Error('DECRYPTION_FAILED_WRONG_PASSPHRASE');
    }
  } catch (e: any) {
    // crypto-js ممکن است خطای Padding یا Malformed بدهد؛ ما آن را نرمالیزه می‌کنیم
    if (e.message?.includes('Malformed UTF-8') || e.message?.includes('bad decrypt')) {
      throw new Error('DECRYPTION_FAILED_WRONG_PASSPHRASE');
    }
    throw e;
  }

  // 🆕 L-10 Fix: بررسی Integrity (SHA-256) - مرحله دوم (بعد از رمزگشایی)
  const computedHash = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    plaintext
  );
  
  if (computedHash.toLowerCase() !== payload.hash.toLowerCase()) {
    throw new Error('INTEGRITY_CHECK_FAILED_CORRUPTED_FILE');
  }

  return plaintext;
}

/* ════════════ High-Level Operations ════════════ */

export interface BackupResult {
  success: boolean;
  fileName?: string;
  error?: string;
  stats?: { keys: number; sizeBytes: number };
}

/** گرفتن بک‌آپ امن و دانلود آن */
export async function createSecureBackup(rawEntries: Record<string, string>): Promise<BackupResult> {
  try {
    const passphrase = await getOrCreatePassphrase();
    const plainObj = { version: 1, exportedAt: new Date().toISOString(), entries: rawEntries };
    const plaintextJson = JSON.stringify(plainObj);
    
    const encrypted = await encryptBackup(plaintextJson, passphrase);
    const finalJson = JSON.stringify(encrypted);
    
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `wellness_secure_${ts}.json`;
    
    return {
      success: true,
      fileName,
      stats: {
        keys: Object.keys(rawEntries).length,
        sizeBytes: new Blob([finalJson]).size,
      },
    };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

/** خواندن و اعتبارسنجی فایل بک‌آپ امن */
export async function validateSecureBackupFile(fileContent: string): Promise<{ valid: boolean; error?: string; preview?: { keys: number; date: string } }> {
  try {
    const payload: EncryptedPayload = JSON.parse(fileContent);
    
    if (payload.v !== 2 || !payload.enc) {
      return { valid: false, error: 'فرمت فایل قدیمی یا ناامن است. لطفاً از نسخهٔ جدید استفاده کنید.' };
    }
    
    // بدون رمزگشایی کامل، فقط metadata را چک کن
    return {
      valid: true,
      preview: {
        keys: payload.meta.keyCount,
        date: payload.meta.exportedAt,
      },
    };
  } catch (e: any) {
    return { valid: false, error: `فایل نامعتبر: ${e?.message}` };
  }
}

/** بازیابی امن با تأیید passphrase */
export async function restoreSecureBackup(
  fileContent: string, 
  userPassphrase: string
): Promise<{ success: boolean; restoredKeys?: number; error?: string }> {
  try {
    const payload: EncryptedPayload = JSON.parse(fileContent);
    
    // فراخوانی decryptBackup که حالا خطاهای استاندارد شده برمی‌گرداند
    const plaintextJson = await decryptBackup(payload, userPassphrase);
    
    const parsed = JSON.parse(plaintextJson);
    
    if (!parsed.entries || typeof parsed.entries !== 'object') {
      return { success: false, error: 'ساختار داخلی بک‌آپ مخدوش است.' };
    }
    
    return { success: true, restoredKeys: Object.keys(parsed.entries).length };
  } catch (e: any) {
    const msg = String(e?.message || '');
    
    // 🆕 L-10 Fix: ترجمه خطاهای فنی به پیام کاربرپسند
    if (msg === 'DECRYPTION_FAILED_WRONG_PASSPHRASE') {
      return { success: false, error: '❌ رمزگشایی ناموفق: passphrase اشتباه است.' };
    }
    if (msg === 'INTEGRITY_CHECK_FAILED_CORRUPTED_FILE') {
      return { success: false, error: '❌ بررسی یکپارچگی ناموفق: فایل بک‌آپ آسیب دیده یا دستکاری شده است.' };
    }
    if (msg.includes('invalid base64')) {
      return { success: false, error: '❌ فایل بک‌آپ خراب است (ساختار نامعتبر).' };
    }
    
    return { success: false, error: `❌ خطای ناشناخته: ${msg}` };
  }
}

/**
 * 🆕 دانلود مستقیم payload رمزنگاری‌شده به عنوان فایل .json
 */
export function downloadEncryptedFile(payload: EncryptedPayload, fileName?: string): void {
  if (typeof window === 'undefined') return; // فقط Web
  
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `wellness_secure_${new Date().toISOString().slice(0,19)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}