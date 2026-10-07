import { useCallback, useMemo } from 'react';
import { useAuth } from '../store/AuthContext';
import { useAssignments } from '../store/AssignmentsContext';
import { usePersonnel } from '../store/PersonnelContext';
import { hasPermission, scopeFor, type Permission, type Scope } from '../utils/permissions';
import { normalizeRole, type AppRole } from '../config/roles';
import { DEFAULT_ORG_ID } from '../utils/org';

export function usePermissions() {
  const { session, accounts } = useAuth();
  const { clientIdsFor } = useAssignments();
  const { getByNationalId } = usePersonnel();

  const account = useMemo(
    () => accounts.find((a) => a.nationalId === session?.nationalId) ?? null,
    [accounts, session],
  );

  const role: AppRole = useMemo(() => normalizeRole(session?.role), [session]);

  const orgId = useMemo(() => {
    return (
      account?.orgId ||
      getByNationalId(session?.nationalId ?? '')?.orgId ||
      DEFAULT_ORG_ID
    );
  }, [account, getByNationalId, session]);

  const can = useCallback(
    (p: Permission): boolean =>
      hasPermission(
        (account?.permissions ?? []) as Permission[],
        (account?.deniedPermissions ?? []) as Permission[],
        role,
        p,
      ),
    [account, role],
  );

  const scope = useCallback(
    (p: Permission): Scope | null => scopeFor(role, p),
    [role],
  );

  /** شناسهٔ مراجعین Assigned به من (برای scope=assigned) */
  const assignedClientIds = useCallback(
    () => clientIdsFor(session?.nationalId ?? ''),
    [clientIdsFor, session],
  );

  const isSelf = useCallback(
    (id: string) => id === session?.nationalId,
    [session],
  );

  return {
    session,
    account,
    role,
    orgId,
    can,
    scope,
    assignedClientIds,
    isSelf,
  };
}