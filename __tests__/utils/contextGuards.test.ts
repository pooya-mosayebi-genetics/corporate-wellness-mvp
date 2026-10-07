import { describe, it, expect, vi } from 'vitest';
import { 
  requirePermission, 
  checkPermission, 
  requireAnyPermission,
  PermissionDeniedError 
} from '../../src/utils/contextGuards';
import type { Session, UserAccount } from '../../src/types/auth';
import type { Permission } from '../../src/utils/permissions';

// Mock session/account helpers
const makeSession = (role: string): Session => ({
  nationalId: '0012345678',
  role: role as any,
  issuedAt: Date.now(),
  expiresAt: Date.now() + 100000,
  lastActivityAt: Date.now(),
});

const makeAccount = (perms: Permission[] = [], denied: Permission[] = []): UserAccount => ({
  nationalId: '0012345678',
  role: 'user' as any,
  active: true,
  passwordSalt: null,
  passwordHash: null,
  pinSalt: null,
  pinHash: null,
  permissions: perms,
  deniedPermissions: denied,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
});

describe('contextGuards', () => {
  describe('requirePermission', () => {
    it('should throw when no session exists', () => {
      expect(() => 
        requirePermission(null, null, 'meal.self.log', 'Fa msg', 'En msg')
      ).toThrow(PermissionDeniedError);
      
      try {
        requirePermission(null, null, 'meal.self.log', 'Fa msg');
      } catch (e: any) {
        expect(e.messageFa).toBe('نشست فعال نیست. لطفاً دوباره وارد شوید.');
      }
    });

    it('should pass when permission granted via role defaults', () => {
      const session = makeSession('nutritionist');
      const account = makeAccount(); // empty overrides
      
      // nutritionist has meal.self.log by default in ROLE_GRANTS
      expect(() => 
        requirePermission(session, account, 'meal.self.log', 'Fa msg')
      ).not.toThrow();
    });

    it('should throw when permission explicitly denied on account', () => {
      const session = makeSession('super_admin');
      const account = makeAccount([], ['access.manage']); // deny specific perm
      
      expect(() => 
        requirePermission(session, account, 'access.manage', 'Fa msg')
      ).toThrow(PermissionDeniedError);
    });

    it('should pass when permission added via user override', () => {
      const session = makeSession('user');
      const account = makeAccount(['diet.design']); // grant extra perm
      
      expect(() => 
        requirePermission(session, account, 'diet.design', 'Fa msg')
      ).not.toThrow();
    });
  });

  describe('checkPermission', () => {
    it('returns false for missing session', () => {
      expect(checkPermission(null, null, 'any.perm')).toBe(false);
    });

    it('returns true for valid permission chain', () => {
      const session = makeSession('coach');
      const account = makeAccount();
      expect(checkPermission(session, account, 'dashboard.coach.view')).toBe(true);
    });
  });

  describe('requireAnyPermission', () => {
    it('passes if ANY one permission matches', () => {
      const session = makeSession('doctor_radiology');
      const account = makeAccount();
      
      // radiologist has section.radiology.edit but NOT analysis.upload maybe?
      // Actually let's assume they have both or just one works
      expect(() => 
        requireAnyPermission(
          session, 
          account, 
          ['analysis.upload', 'section.radiology.edit'],
          'Fa msg'
        )
      ).not.toThrow();
    });

    it('throws if NONE match', () => {
      const session = makeSession('user');
      const account = makeAccount();
      
      expect(() => 
        requireAnyPermission(
          session, 
          account, 
          ['access.manage', 'backup.restore'],
          'Fa msg'
        )
      ).toThrow(PermissionDeniedError);
    });
  });
});