import AsyncStorage from '@react-native-async-storage/async-storage';

/* ─────────────────────────────────────────────────────────────
   ژرفا · کلاینت API
   - نگهداری توکن Access/Refresh
   - refresh خودکار در صورت 401
   - خطای استاندارد: err.apiError = { error, fa, en, status, details }
   ───────────────────────────────────────────────────────────── */

const RAW_BASE =
  (typeof process !== 'undefined' && process.env && (process.env as any).EXPO_PUBLIC_API_URL) ||
  'https://api.camcalorie.ir';

export const API_BASE_URL = String(RAW_BASE).trim().replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'camcalorie.accessToken';
const REFRESH_TOKEN_KEY = 'camcalorie.refreshToken';

export interface ApiErrorPayload {
  error: string;
  fa?: string;
  en?: string;
  status?: number;
  details?: any;
}

export class ApiError extends Error {
  apiError: ApiErrorPayload;

  constructor(payload: ApiErrorPayload) {
    super(payload.fa || payload.en || payload.error);
    this.name = 'ApiError';
    this.apiError = payload;
  }
}

/* ─────────── Token Storage ─────────── */

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokensPromise: Promise<void> | null = null;

async function loadTokens(): Promise<void> {
  if (!tokensPromise) {
    tokensPromise = (async () => {
      try {
        const [a, r] = await Promise.all([
          AsyncStorage.getItem(ACCESS_TOKEN_KEY),
          AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        ]);
        accessToken = a;
        refreshToken = r;
      } catch {
        accessToken = null;
        refreshToken = null;
      }
    })();
  }
  return tokensPromise;
}

function resetTokensCache(): void {
  tokensPromise = Promise.resolve();
}

async function persistTokens(access?: string | null, refresh?: string | null): Promise<void> {
  await loadTokens();

  if (access !== undefined) accessToken = access;
  if (refresh !== undefined) refreshToken = refresh;

  try {
    if (accessToken) {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // ignore storage failure
  }
}

export function clearApiTokens(): void {
  accessToken = null;
  refreshToken = null;
  resetTokensCache();
  AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]).catch(() => {});
}

/* ─────────── Refresh ─────────── */

let refreshingPromise: Promise<any> | null = null;

async function doRefresh(): Promise<any> {
  await loadTokens();

  if (!refreshToken) {
    throw new ApiError({
      error: 'NO_REFRESH_TOKEN',
      fa: 'نشست منقضی شده است. لطفاً دوباره وارد شوید.',
      en: 'Session expired. Please sign in again.',
      status: 401,
    });
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    clearApiTokens();
    throw new ApiError({
      error: data?.error || 'REFRESH_FAILED',
      fa: data?.fa || 'تمدید نشست ناموفق بود.',
      en: data?.en || 'Token refresh failed.',
      status: res.status,
      details: data?.details,
    });
  }

  const tokens = data?.tokens;
  if (tokens?.accessToken && tokens?.refreshToken) {
    await persistTokens(tokens.accessToken, tokens.refreshToken);
  } else {
    clearApiTokens();
    throw new ApiError({
      error: 'INVALID_REFRESH_RESPONSE',
      fa: 'پاسخ تمدید نشست نامعتبر است.',
      en: 'Invalid refresh response.',
      status: 500,
    });
  }

  return data;
}

async function refreshTokens(): Promise<any> {
  if (!refreshingPromise) {
    refreshingPromise = doRefresh().finally(() => {
      refreshingPromise = null;
    });
  }
  return refreshingPromise;
}

/* ─────────── Core Request ─────────── */

async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  await loadTokens();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError({
      error: 'NETWORK_ERROR',
      fa: 'اتصال به سرور برقرار نشد.',
      en: 'Network error.',
      status: 0,
    });
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    // اگر 401 بود و refresh token داشتیم و خودِ مسیر refresh نبود، یک بار retry
    if (
      res.status === 401 &&
      allowRefresh &&
      refreshToken &&
      !path.startsWith('/api/auth/refresh')
    ) {
      try {
        await refreshTokens();
        return await request<T>(path, options, false);
      } catch {
        // اگر refresh نشد، خطای اصلی 401 را برگردان
      }
    }

    const payload: ApiErrorPayload =
      data && typeof data === 'object'
        ? {
            error: data.error || `HTTP_${res.status}`,
            fa: data.fa,
            en: data.en,
            status: res.status,
            details: data.details,
          }
        : {
            error: `HTTP_${res.status}`,
            fa: 'خطای سرور.',
            en: 'Server error.',
            status: res.status,
          };

    throw new ApiError(payload);
  }

  return data as T;
}

/* ─────────── Types ─────────── */

export interface AuthUser {
  nationalId: string;
  role: string;
  fullName: string;
  isActive?: boolean;
  permissions: string[];
  deniedPermissions: string[];
  lastLoginAt?: string | null;
}

export interface SubmitCodeResponse {
  status: 'password' | 'setup';
  bootstrap: boolean;
  ticket: string;
}

export interface SessionResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface PersonnelImportResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{
    index: number;
    nationalId: string;
    message: string;
  }>;
  orgsCreated?: number;
}

export interface PersonnelItem {
  id: string;
  nationalId: string;
  fullName: string;
  fullNamePrefixed?: string | null;
  mobile?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  position?: string | null;
  department?: string | null;
  organizationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonnelListResponse {
  total: number;
  items: PersonnelItem[];
}

export interface MealDto {
  id: string;
  type: string;
  date: string;
  time: string;
  name?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: any[];
  loggedAt: string;
}

export interface ServerMeal extends MealDto {
  userId: string;
  idempotencyKey?: string | null;
  deletedAt?: string | null;
}

export interface MealListResponse {
  total: number;
  items: ServerMeal[];
}

export interface AnalysisDto {
  id: string;
  nationalId: string;
  fullName?: string | null;
  mobile?: string | null;
  gender?: string | null;
  age?: number | null;
  weight?: string | null;
  height?: string | null;
  bmi?: string | null;
  bodyFatPercentage?: string | null;
  skeletalMuscleMass?: string | null;
  visceralFatLevel?: string | null;
  basalMetabolicRate?: string | null;
  bodyWater?: string | null;
  proteinMass?: string | null;
  mineralMass?: string | null;
  rawData?: any;
  analyzedAt?: string | null;
}

export interface ServerAnalysis extends AnalysisDto {
  idempotencyKey?: string | null;
  createdAt?: string;
}

export interface AnalysisListResponse {
  total: number;
  items: ServerAnalysis[];
}

export interface UserItem {
  id: string;
  nationalId: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: string;
  isActive: boolean;
  permissions: string[];
  deniedPermissions: string[];
  loginFailures?: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  total: number;
  items: UserItem[];
}

/* ─────────── API Client ─────────── */

class ApiClient {
  baseUrl = API_BASE_URL;

  /* ── Auth ── */

  async submitCode(nationalId: string): Promise<SubmitCodeResponse> {
    return request<SubmitCodeResponse>('/api/auth/submit-code', {
      method: 'POST',
      body: JSON.stringify({ nationalId }),
    });
  }

  async submitPassword(ticket: string, password: string): Promise<SessionResponse> {
    const r = await request<SessionResponse>('/api/auth/submit-password', {
      method: 'POST',
      body: JSON.stringify({ ticket, password }),
    });
    await persistTokens(r.tokens.accessToken, r.tokens.refreshToken);
    return r;
  }

  async completeSetup(ticket: string, password: string): Promise<SessionResponse> {
    try {
      const r = await request<SessionResponse>('/api/auth/complete-setup', {
        method: 'POST',
        body: JSON.stringify({ ticket, password }),
      });
      await persistTokens(r.tokens.accessToken, r.tokens.refreshToken);
      return r;
    } catch (e) {
      if (e instanceof ApiError && (e.apiError.status === 404 || e.apiError.error === 'NOT_FOUND')) {
        const r = await request<SessionResponse>('/api/auth/setup', {
          method: 'POST',
          body: JSON.stringify({ ticket, password }),
        });
        await persistTokens(r.tokens.accessToken, r.tokens.refreshToken);
        return r;
      }
      throw e;
    }
  }

  async me(): Promise<AuthUser> {
    return request<AuthUser>('/api/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' }, false);
    } catch {
      // حتی اگر سرور خطا داد، محلی پاک می‌کنیم
    } finally {
      clearApiTokens();
    }
  }

  async refresh(): Promise<any> {
    return refreshTokens();
  }

  /* ── Personnel ── */

  async importPersonnel(rows: any[], defaultOrgId?: string): Promise<PersonnelImportResult> {
    const body: any = { rows };
    if (defaultOrgId) body.defaultOrgId = defaultOrgId;

    return request<PersonnelImportResult>('/api/personnel/import', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listPersonnel(params: {
    search?: string;
    limit?: number;
    offset?: number;
    orgId?: string;
  } = {}): Promise<PersonnelListResponse> {
    const qs: string[] = [];
    if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`);
    if (params.orgId) qs.push(`orgId=${encodeURIComponent(params.orgId)}`);
    qs.push(`limit=${params.limit ?? 50}`);
    qs.push(`offset=${params.offset ?? 0}`);

    return request<PersonnelListResponse>(`/api/personnel?${qs.join('&')}`);
  }

  async getPersonnelByNationalId(nationalId: string): Promise<PersonnelItem> {
    return request<PersonnelItem>(
      `/api/personnel/by-national-id/${encodeURIComponent(nationalId)}`,
    );
  }

  /* ── Sync: Meals ── */

  async upsertMeal(idempotencyKey: string, meal: MealDto): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/api/meals', {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey, meal }),
    });
  }

  async listMyMeals(params: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MealListResponse> {
    const qs: string[] = [];
    if (params.from) qs.push(`from=${encodeURIComponent(params.from)}`);
    if (params.to) qs.push(`to=${encodeURIComponent(params.to)}`);
    qs.push(`limit=${params.limit ?? 200}`);
    qs.push(`offset=${params.offset ?? 0}`);

    return request<MealListResponse>(`/api/meals?${qs.join('&')}`);
  }

  async deleteMyMeal(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/meals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async deleteMyMealByIdempotencyKey(idempotencyKey: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      `/api/meals/by-key/${encodeURIComponent(idempotencyKey)}`,
      {
        method: 'DELETE',
      },
    );
  }

  /* ── Sync: Body Analyses ── */

  async upsertAnalysis(idempotencyKey: string, record: AnalysisDto): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>('/api/body-analyses', {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey, record }),
    });
  }

  async listMyAnalyses(params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<AnalysisListResponse> {
    const qs = [`limit=${params.limit ?? 100}`, `offset=${params.offset ?? 0}`];
    return request<AnalysisListResponse>(`/api/body-analyses?${qs.join('&')}`);
  }

  /* ── User Management ── */

  async listUsers(params: {
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<UserListResponse> {
    const qs: string[] = [];
    if (params.search) qs.push(`search=${encodeURIComponent(params.search)}`);
    qs.push(`limit=${params.limit ?? 50}`);
    qs.push(`offset=${params.offset ?? 0}`);

    return request<UserListResponse>(`/api/users?${qs.join('&')}`);
  }

  async createUser(nationalId: string, role: string = 'user'): Promise<UserItem> {
    return request<UserItem>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ nationalId, role }),
    });
  }

  async setUserRole(nationalId: string, role: string): Promise<UserItem> {
    return request<UserItem>(`/api/users/${encodeURIComponent(nationalId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async setUserActive(nationalId: string, isActive: boolean): Promise<UserItem> {
    return request<UserItem>(`/api/users/${encodeURIComponent(nationalId)}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async resetUserPassword(nationalId: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(
      `/api/users/${encodeURIComponent(nationalId)}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );
  }

  async setUserPermissions(
    nationalId: string,
    permissions: string[],
    deniedPermissions: string[],
  ): Promise<UserItem> {
    return request<UserItem>(`/api/users/${encodeURIComponent(nationalId)}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions, deniedPermissions }),
    });
  }

  async getRolesCatalog(): Promise<{ roles: any[] }> {
    return request<{ roles: any[] }>('/api/users/roles');
  }

  async getPermissionsCatalog(): Promise<{ permissions: any[] }> {
    return request<{ permissions: any[] }>('/api/users/permissions');
  }
}

export const api = new ApiClient();
export default api;