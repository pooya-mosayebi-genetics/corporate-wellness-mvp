/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · API Client Service (L-10 Phase 5.1 - Secure Version)
 * ─────────────────────────────────────────────────────────────
 */

const IS_MOCK = false;
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.camcalorie.ir';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    nationalId: string;
    role: string;
    fullName: string;
    permissions: string[];
  };
}

/* ═══════════ Helper: Delay for Mocking Network Latency ═══════════ */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  if (IS_MOCK) return mockHandler(endpoint, options);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

/* ═══════════ Mock Handlers ═══════════ */
async function mockHandler<T>(endpoint: string, options: RequestInit): Promise<any> {
  await delay(600); // شبیه‌سازی تأخیر شبکه

  if (endpoint === '/auth/login') {
    const body = JSON.parse(options.body as string);
    const nid = body.nationalId;
    const pass = body.password;

    // 🔒 MOCK SECURITY RULE: 
    // برای تست، فرض می‌کنیم رمز همه کاربران "12345678" است.
    // در نسخه واقعی، سرور این را چک می‌کند.
    if (pass !== '12345678') {
       return { success: false, error: 'رمز عبور اشتباه است' };
    }

    // فرض کنیم هر کد ملی ۱۰ رقمی که از قبل در دیتابیس هست، معتبر است
    // (چون ما قبلاً در Context چک کردیم که در پرسنل وجود دارد)
    return {
      success: true,
      data: {
        token: `mock-jwt-${Date.now()}`,
        refreshToken: `mock-refresh-${Date.now()}`,
        user: {
          nationalId: nid,
          role: 'user', // نقش پیش‌فرض؛ در نسخه واقعی از DB خوانده می‌شود
          fullName: 'کاربر نمونه',
          permissions: [],
        },
      },
    };
  }

  return { success: false, error: 'Endpoint not found' };
}

export const apiClient = {
  async login(nationalId: string, password: string): Promise<{ success: boolean; data?: LoginResponse; error?: string }> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nationalId, password }),
    });
  },
};