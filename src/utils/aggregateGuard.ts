/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · نگهبان دادهٔ تجمیعی (L-09)
 *  جلوگیری از نشت دادهٔ فردی در گزارش‌های HR/aggregate.
 *  - حذف شناسه‌های مستقیم
 *  - سرکوب سلول‌های کوچک‌تر از MIN_CELL_SIZE
 *  - بررسی دسترسی فردی در permissionهای تجمیعی
 * ─────────────────────────────────────────────────────────────
 */
import { hasScopedPermission, scopeFor, type Permission, type Scope } from './permissions';
import { PermissionDeniedError } from './contextGuards';
import type { Session, UserAccount } from '../types/auth';
import { normalizeRole } from '../config/roles';

/** حداقل اندازهٔ گروه برای جلوگیری از re-identification */
export const MIN_CELL_SIZE = 5;

/**
 * Permissionهایی که برای نقش‌های HR به‌صورت سخت‌گیرانه فقط aggregate هستند.
 * حتی اگر override کاربری وجود داشته باشد، دادهٔ فردی از این مسیرها نشت نکند.
 */
const HARD_AGGREGATE_PERMISSIONS = new Set<Permission>([
  'dashboard.hr.view',
  'reports.view',
  'summary.weekly.view',
  'analysis.view',
]);

const HARD_AGGREGATE_ROLES = new Set(['hr_admin', 'hr_viewer']);

/** scopeهایی که دسترسی فردی محسوب می‌شوند */
const INDIVIDUAL_SCOPES: Scope[] = ['self', 'assigned', 'org', 'event', 'global'];

/* ────────────────────────────────────────────────────────────────
   شناسه‌های مستقیم
   ──────────────────────────────────────────────────────────────── */

const DIRECT_ID_EXACT = new Set([
  'nationalid',
  'nid',
  'nationalcode',
  'code',
  'mobile',
  'mobilenumber',
  'phone',
  'phonenumber',
  'tel',
  'telephone',
  'fullname',
  'name',
  'namefa',
  'nameen',
  'displayname',
  'firstname',
  'lastname',
  'email',
  'username',
  'passportid',
  'shenasheh',
  'clientid',
  'patientid',
  'personid',
  'userid',
  'accountid',
  'employeeid',
  'staffid',
]);

const DIRECT_ID_SUFFIXES = [
  'nationalid',
  'nationalcode',
  'mobilenumber',
  'phonenumber',
  'fullname',
  'displayname',
  'passportid',
  'clientid',
  'patientid',
  'personid',
  'userid',
  'employeeid',
  'staffid',
];

export function isDirectIdentifierKey(key: string): boolean {
  const k = String(key || '')
    .replace(/[_\-\s]/g, '')
    .toLowerCase();

  if (!k) return false;
  if (DIRECT_ID_EXACT.has(k)) return true;

  return DIRECT_ID_SUFFIXES.some((suffix) => k.endsWith(suffix));
}

function looksLikeDirectValue(value: unknown): boolean {
  const s = String(value ?? '').trim();
  if (!s) return false;

  // ایمیل
  if (s.includes('@') && s.includes('.')) return true;

  // کد ملی/شماره شبیه ۱۰ رقم
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 16) return true;

  return false;
}

/* ────────────────────────────────────────────────────────────────
   هلپرهای آبجکت/آرایه
   ──────────────────────────────────────────────────────────────── */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function deepClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function collectDirectPaths(node: unknown, path: string, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectDirectPaths(v, `${path}[${i}]`, out));
    return;
  }

  if (!isPlainObject(node)) return;

  for (const [key, value] of Object.entries(node)) {
    const nextPath = `${path}.${key}`;
    if (isDirectIdentifierKey(key)) {
      out.push(nextPath);
    }
    collectDirectPaths(value, nextPath, out);
  }
}

export function collectDirectIdentifierPaths(data: unknown): string[] {
  const out: string[] = [];
  collectDirectPaths(data, 'root', out);
  return out;
}

function stripDirect(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripDirect);
  }

  if (!isPlainObject(node)) {
    return node;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (isDirectIdentifierKey(key)) continue;
    out[key] = stripDirect(value);
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────
   سرکوب سلول‌های کوچک
   ──────────────────────────────────────────────────────────────── */

const COUNT_KEYS = new Set(['count', 'n', 'total', 'samplesize', 'size']);

function isMetricNumber(key: string, value: unknown): boolean {
  if (typeof value !== 'number' || !isFinite(value)) return false;
  const k = String(key || '').toLowerCase();
  return !COUNT_KEYS.has(k) && k !== 'suppressed' && k !== 'countlabel';
}

function suppressSmallCells(node: unknown, min: number, stats: { suppressed: number }): unknown {
  if (Array.isArray(node)) {
    return node.map((v) => suppressSmallCells(v, min, stats));
  }

  if (!isPlainObject(node)) {
    return node;
  }

  const countVal =
    (typeof node.count === 'number' ? node.count : undefined) ??
    (typeof node.n === 'number' ? node.n : undefined) ??
    (typeof node.total === 'number' ? node.total : undefined) ??
    (typeof node.sampleSize === 'number' ? node.sampleSize : undefined) ??
    (typeof node.size === 'number' ? node.size : undefined);

  const count = typeof countVal === 'number' && isFinite(countVal) ? countVal : NaN;

  const hasMetric = Object.entries(node).some(([k, v]) => isMetricNumber(k, v));
  const shouldSuppress = !isNaN(count) && count > 0 && count < min && hasMetric;

  const out: Record<string, unknown> = {};

  if (shouldSuppress) {
    stats.suppressed += 1;
  }

  for (const [key, value] of Object.entries(node)) {
    if (shouldSuppress && isMetricNumber(key, value)) {
      out[key] = null;
      continue;
    }

    if (key === 'suppressed') {
      out[key] = shouldSuppress ? true : value;
      continue;
    }

    out[key] = suppressSmallCells(value, min, stats);
  }

  if (shouldSuppress) {
    out.suppressed = true;
    out.countLabel = `<${min}`;

    // تعداد دقیق فاش نشود
    for (const ck of COUNT_KEYS) {
      const actualKey = Object.keys(out).find((k) => k.toLowerCase() === ck);
      if (actualKey) out[actualKey] = null;
    }
  }

  return out;
}

/* ────────────────────────────────────────────────────────────────
   API اصلی sanitize/assert
   ──────────────────────────────────────────────────────────────── */

export interface AggregateSanitizeResult<T> {
  data: T;
  removed: string[];
  suppressedGroups: number;
}

/**
 * بدون throw؛ شناسه‌های مستقیم را حذف و سلول‌های کوچک را سرکوب می‌کند.
 * برای UI مناسب است.
 */
export function sanitizeAggregatePayload<T>(
  data: T,
  minCellSize: number = MIN_CELL_SIZE,
): AggregateSanitizeResult<T> {
  const clone = deepClone(data);
  const removed = collectDirectIdentifierPaths(clone);
  const stripped = stripDirect(clone);

  const stats = { suppressed: 0 };
  const sanitized = suppressSmallCells(stripped, minCellSize, stats);

  return {
    data: sanitized as T,
    removed,
    suppressedGroups: stats.suppressed,
  };
}

/**
 * اگر شناسهٔ مستقیم وجود داشته باشد، throw می‌کند.
 * برای لایهٔ داده/test مناسب است.
 */
export function assertAggregatePayload<T>(
  data: T,
  minCellSize: number = MIN_CELL_SIZE,
): T {
  const result = sanitizeAggregatePayload(data, minCellSize);
  if (result.removed.length > 0) {
    throw new Error(
      `Direct identifiers detected in aggregate payload: ${result.removed.slice(0, 10).join(', ')}`,
    );
  }
  return result.data;
}

/* ────────────────────────────────────────────────────────────────
   دسترسی فردی vs تجمیعی
   ──────────────────────────────────────────────────────────────── */

export function isHardAggregateRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return HARD_AGGREGATE_ROLES.has(r);
}

export function isHardAggregatePermission(permission: Permission): boolean {
  return HARD_AGGREGATE_PERMISSIONS.has(permission);
}

/**
 * آیا کاربر تحت این permission می‌تواند دادهٔ فردی ببیند؟
 * برای permissionهای hard-aggregate نقش HR همیشه false است.
 */
export function canAccessIndividualUnderPermission(
  session: Session | null | undefined,
  account: UserAccount | null | undefined,
  permission: Permission,
): boolean {
  if (!session) return false;

  if (isHardAggregatePermission(permission) && isHardAggregateRole(session.role)) {
    return false;
  }

  return hasScopedPermission(
    session.role,
    permission,
    INDIVIDUAL_SCOPES,
    account
      ? {
          permissions: (account.permissions ?? []) as Permission[],
          deniedPermissions: (account.deniedPermissions ?? []) as Permission[],
        }
      : null,
  );
}

/**
 * اگر دسترسی فردی مجاز نباشد، PermissionDeniedError throw می‌کند.
 */
export function requireIndividualAccess(
  session: Session | null | undefined,
  account: UserAccount | null | undefined,
  permission: Permission,
  messageFa: string,
  messageEn?: string,
): void {
  if (!canAccessIndividualUnderPermission(session, account, permission)) {
    throw new PermissionDeniedError(permission, messageFa, messageEn);
  }
}

/**
 * اگر نقش/permission نیازمند aggregate بودن باشد، payload را امن می‌کند.
 */
export function guardAggregatePayload<T>(
  data: T,
  session: Session | null | undefined,
  account: UserAccount | null | undefined,
  permission: Permission,
  minCellSize: number = MIN_CELL_SIZE,
): T {
  if (!session) return data;

  const scope = scopeFor(session.role, permission);
  const needsAggregate =
    scope === 'aggregate' ||
    (isHardAggregatePermission(permission) && isHardAggregateRole(session.role));

  if (!needsAggregate) return data;

  return sanitizeAggregatePayload(data, minCellSize).data;
}

/* ────────────────────────────────────────────────────────────────
   ساخت aggregate امن از rows خام
   ──────────────────────────────────────────────────────────────── */

export interface AggregateBucket {
  key: string;
  label: string;
  count: number | null;
  countLabel: string;
  suppressed: boolean;
  avg: Record<string, number | null>;
  sum: Record<string, number | null>;
  min: Record<string, number | null>;
  max: Record<string, number | null>;
}

/**
 * از rows خام (مثلاً پرسنل/آنالیز) یک aggregate امن می‌سازد.
 * اگر groupBy یا labelKey شناسهٔ مستقیم باشد، throw می‌کند.
 */
export function aggregateRows(
  rows: Record<string, any>[],
  opts: {
    groupBy: string;
    labelKey?: string;
    valueKeys: string[];
    minCellSize?: number;
  },
): AggregateBucket[] {
  const min = opts.minCellSize ?? MIN_CELL_SIZE;

  if (isDirectIdentifierKey(opts.groupBy)) {
    throw new Error(`Cannot group aggregate by direct identifier: ${opts.groupBy}`);
  }

  if (opts.labelKey && isDirectIdentifierKey(opts.labelKey)) {
    throw new Error(`Cannot label aggregate by direct identifier: ${opts.labelKey}`);
  }

  const valueKeys = opts.valueKeys.filter((k) => !isDirectIdentifierKey(k));

  interface BucketAcc {
    count: number;
    label: string;
    sums: Record<string, number>;
    counts: Record<string, number>;
    mins: Record<string, number>;
    maxs: Record<string, number>;
  }

  const map = new Map<string, BucketAcc>();

  for (const row of rows || []) {
    const rawKey = row?.[opts.groupBy];
    const key = String(rawKey ?? '—');

    // اگر مقدار گروه شبیه شناسهٔ مستقیم باشد، اجازه نده aggregate با آن ساخته شود
    if (looksLikeDirectValue(rawKey)) {
      throw new Error(`Aggregate group value looks like direct identifier in field "${opts.groupBy}"`);
    }

    const label = opts.labelKey ? String(row?.[opts.labelKey] ?? key) : key;

    if (!map.has(key)) {
      map.set(key, {
        count: 0,
        label,
        sums: {},
        counts: {},
        mins: {},
        maxs: {},
      });
    }

    const bucket = map.get(key)!;
    bucket.count += 1;

    for (const vk of valueKeys) {
      const v = Number(row?.[vk]);
      if (!isFinite(v)) continue;

      bucket.sums[vk] = (bucket.sums[vk] ?? 0) + v;
      bucket.counts[vk] = (bucket.counts[vk] ?? 0) + 1;
      bucket.mins[vk] = bucket.mins[vk] === undefined ? v : Math.min(bucket.mins[vk], v);
      bucket.maxs[vk] = bucket.maxs[vk] === undefined ? v : Math.max(bucket.maxs[vk], v);
    }
  }

  return Array.from(map.entries()).map(([key, bucket]) => {
    const suppressed = bucket.count < min;

    const avg: Record<string, number | null> = {};
    const sum: Record<string, number | null> = {};
    const minOut: Record<string, number | null> = {};
    const maxOut: Record<string, number | null> = {};

    for (const vk of valueKeys) {
      if (suppressed || !bucket.counts[vk]) {
        avg[vk] = null;
        sum[vk] = null;
        minOut[vk] = null;
        maxOut[vk] = null;
      } else {
        avg[vk] = bucket.sums[vk] / bucket.counts[vk];
        sum[vk] = bucket.sums[vk];
        minOut[vk] = bucket.mins[vk];
        maxOut[vk] = bucket.maxs[vk];
      }
    }

    return {
      key: suppressed ? '—' : key,
      label: suppressed ? '—' : bucket.label,
      count: suppressed ? null : bucket.count,
      countLabel: suppressed ? `<${min}` : String(bucket.count),
      suppressed,
      avg,
      sum,
      min: minOut,
      max: maxOut,
    };
  });
}