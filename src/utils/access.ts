import { normalizeRole } from '../config/roles';
import { hasScopedPermission, type Permission, type Scope } from './permissions';

export type UserRole = string;

// 🆕 L-10 Fix: افزودن 'user-management' به لیست مسیرهای مجاز
export type RouteKey =
  | 'home'
  | 'my-analysis'
  | 'my-diet'
  | 'log-meal'
  | 'leaderboard'
  | 'ai-chat'
  | 'tickets'
  | 'tips'
  | 'profile'
  | 'analysis'
  | 'reports'
  | 'weekly'
  | 'clients'
  | 'client-detail'
  | 'coach'
  | 'diet-plans'
  | 'hr'
  | 'personnel'
  | 'audit'
  | 'import'
  | 'food-import'
  | 'content-studio'
  | 'challenge-admin'
  | 'admin'
  | 'backup'
  | 'logs'
  | 'tests'
  | 'user-management'; 

type RouteReq =
  | Permission
  | {
      p: Permission;
      scopes?: Scope[];
    };

const NON_SELF_SCOPES: Scope[] = ['assigned', 'org', 'event', 'aggregate', 'global'];
const STAFF_SCOPES: Scope[] = ['org', 'event', 'aggregate', 'global'];

/** هر مسیر = مجموعهٔ Permission لازم (همه باید حضور داشته باشند) */
const ROUTE_PERMISSIONS: Record<RouteKey, RouteReq[]> = {
  home: [],
  leaderboard: [],
  'ai-chat': [],
  tickets: [],
  tips: [],
  profile: [],

  'my-analysis': ['analysis.view'],
  'my-diet': ['diet.self.view'],
  'log-meal': ['meal.self.log'],

  analysis: [{ p: 'analysis.view', scopes: STAFF_SCOPES }],
  reports: [{ p: 'reports.view', scopes: NON_SELF_SCOPES }],
  weekly: [{ p: 'summary.weekly.view', scopes: NON_SELF_SCOPES }],

  clients: ['clients.list.view'],

  // 🔒 L-10 Security Fix: client-detail سخت‌گیرانه شد.
  // کاربر عادی (role: 'user') نباید به اینجا دسترسی داشته باشد.
  // فقط نقش‌هایی که permission 'client.record.view' دارند یا scope سازمانی دارند.
  'client-detail': [
    { p: 'client.record.view', scopes: ['assigned', 'org', 'global'] }
  ],

  coach: [{ p: 'dashboard.coach.view', scopes: NON_SELF_SCOPES }],
  'diet-plans': ['diet.design'],
  hr: [{ p: 'dashboard.hr.view', scopes: NON_SELF_SCOPES }],
  personnel: ['personnel.view'],
  audit: ['audit.view'],
  import: ['personnel.import'],
  'food-import': [{ p: 'food.import', scopes: STAFF_SCOPES }],
  'content-studio': ['content.manage'],
  'challenge-admin': ['challenge.manage'],
  admin: ['access.manage'],
  backup: ['backup.export'],
  logs: ['audit.view'],
  tests: ['system.tests.view'],
  'user-management': ['access.manage'], 
};

const roleCache = new Map<string, ReturnType<typeof normalizeRole>>();

function getCachedNormalizedRole(role: string | null | undefined): ReturnType<typeof normalizeRole> {
  const key = String(role ?? '').trim().toLowerCase();
  if (roleCache.has(key)) return roleCache.get(key)!;
  const result = normalizeRole(role);
  roleCache.set(key, result);
  return result;
}

export function canAccess(
  role: string | null | undefined,
  key: RouteKey | string,
  user?: {
    permissions?: Permission[] | null;
    deniedPermissions?: Permission[] | null;
  } | null,
): boolean {
  const normalized = getCachedNormalizedRole(role);
  const need = ROUTE_PERMISSIONS[key as RouteKey];

  if (need === undefined) return false;
  
  // ⚠️ اگر لیست نیازها خالی بود، یعنی همه دسترسی دارند (مثل Home).
  // اما برای client-detail ما لیست خالی نیست، پس چک می‌شود.
  if (need.length === 0) return true;

  return need.every((req) => {
    const permission = typeof req === 'string' ? req : req.p;
    const scopes = typeof req === 'string' ? undefined : req.scopes;
    return hasScopedPermission(normalized, permission, scopes ?? null, user);
  });
}

export function canViewClientRecord(params: {
  role: string | null | undefined;
  user?: { permissions?: Permission[] | null; deniedPermissions?: Permission[] | null } | null;
  targetId: string;
  actorId?: string | null;
  breakGlassGrant?: {
    actorId: string;
    targetId: string;
    expiresAt: number;
    revoked?: boolean;
    scope: Permission[];
  } | null;
}): boolean {
  const { role, user, targetId, actorId, breakGlassGrant } = params;
  const normalized = getCachedNormalizedRole(role);

  // ۱) دسترسی عادی
  const normalOk = hasScopedPermission(normalized, 'client.record.view', null, user);
  if (normalOk) return true;

  // ۲) break-glass معتبر
  if (breakGlassGrant) {
    const now = Date.now();
    const valid =
      !breakGlassGrant.revoked &&
      breakGlassGrant.expiresAt > now &&
      breakGlassGrant.targetId === targetId &&
      (!actorId || breakGlassGrant.actorId === actorId) &&
      breakGlassGrant.scope.includes('client.record.view');
    if (valid) return true;
  }

  return false;
}

export function homeRouteFor(role: string | null | undefined): string {
  const r = getCachedNormalizedRole(role);
  switch (r) {
    case 'coach': return '/coach';
    case 'hr_admin':
    case 'hr_viewer': return '/hr';
    case 'nutritionist':
    case 'doctor_internal':
    case 'doctor_sports':
    case 'doctor_radiology':
    case 'doctor_cardiology':
    case 'nurse':
    case 'rad_assistant':
    case 'cardio_assistant':
    case 'reception': return '/clients';
    case 'event_manager':
    case 'data_analyst': return '/reports';
    case 'super_admin':
    case 'it_admin':
    case 'org_owner':
    case 'org_admin':
    case 'user':
    default: return '/';
  }
}

export function getRouteRequirements(key: RouteKey | string): RouteReq[] | null {
  return ROUTE_PERMISSIONS[key as RouteKey] ?? null;
}

/**
 * 🛡️ L-10 Security: آیا کاربر اصلاً باید دکمه «پرونده مراجع» را ببیند؟
 * کاربر عادی (user) هرگز نباید این دکمه را ببیند.
 * فقط نقش‌های تخصصی و مدیریتی.
 */
export function canReachClientDetail(
  role: string | null | undefined,
  user?: { permissions?: Permission[] | null; deniedPermissions?: Permission[] | null } | null,
): boolean {
  const normalized = getCachedNormalizedRole(role);

  // ❌ کاربر عادی رد می‌شود
  if (normalized === 'user') return false;

  // ✅ نقش‌های مجاز برای دیدن پرونده دیگران
  const ALLOWED_ROLES = new Set([
    'super_admin', 'it_admin', 'org_owner', 'org_admin',
    'coach', 'nutritionist', 'doctor_internal', 'doctor_sports',
    'doctor_radiology', 'doctor_cardiology', 'nurse', 'hr_admin', 'hr_viewer',
    'reception', 'event_manager', 'data_analyst'
  ]);
  
  return ALLOWED_ROLES.has(normalized);
}