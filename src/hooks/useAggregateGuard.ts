import { useCallback, useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { scopeFor, type Permission } from '../utils/permissions';
import {
  MIN_CELL_SIZE,
  canAccessIndividualUnderPermission,
  guardAggregatePayload,
  isHardAggregatePermission,
  isHardAggregateRole,
  requireIndividualAccess,
  sanitizeAggregatePayload,
} from '../utils/aggregateGuard';

/**
 * هوک نگهبان aggregate (L-09).
 *
 * مصرف‌کننده:
 * const { isAggregateOnly, guard, requireIndividual, minCellSize } = useAggregateGuard('dashboard.hr.view');
 *
 * اگر کاربر فقط aggregate باشد:
 * - guard شناسه‌های مستقیم را حذف و سلول‌های کوچک را سرکوب می‌کند
 * - requireIndividual برای دسترسی فردی throw می‌کند
 */
export function useAggregateGuard(permission: Permission) {
  const { session, account, role } = usePermissions();

  const scope = useMemo(() => scopeFor(role, permission), [role, permission]);

  const isAggregateOnly = useMemo(() => {
    return (
      scope === 'aggregate' ||
      (isHardAggregatePermission(permission) && isHardAggregateRole(role))
    );
  }, [scope, permission, role]);

  const guard = useCallback(
    <T,>(data: T): T => {
      if (!isAggregateOnly) return data;
      return guardAggregatePayload(data, session, account, permission, MIN_CELL_SIZE);
    },
    [isAggregateOnly, session, account, permission],
  );

  const sanitize = useCallback(
    <T,>(data: T) => sanitizeAggregatePayload(data, MIN_CELL_SIZE),
    [],
  );

  const canIndividual = useCallback(
    () => canAccessIndividualUnderPermission(session, account, permission),
    [session, account, permission],
  );

  const requireIndividual = useCallback(() => {
    requireIndividualAccess(
      session,
      account,
      permission,
      'دسترسی فردی برای این گزارش مجاز نیست؛ فقط دادهٔ تجمیعی مجاز است.',
      'Individual access is not allowed for this report; aggregate data only.',
    );
  }, [session, account, permission]);

  return {
    scope,
    isAggregateOnly,
    guard,
    sanitize,
    canIndividual,
    requireIndividual,
    minCellSize: MIN_CELL_SIZE, // 🆕 برای مصرف در UI
  };
}