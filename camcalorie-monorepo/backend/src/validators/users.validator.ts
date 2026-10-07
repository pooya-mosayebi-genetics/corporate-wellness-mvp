import { z } from 'zod';
import { isValidNationalId } from '../lib/national-id';
import { APP_ROLES } from '@shared/roles';
import { PERMISSION_KEYS } from '@shared/permissions';

const roleSchema = z.enum(APP_ROLES);
const permissionSchema = z.enum(PERMISSION_KEYS);

export const createUserSchema = z.object({
  nationalId: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{10}$/, 'National ID must be 10 digits'))
    .refine((id) => isValidNationalId(id), 'Invalid national ID'),
  role: roleSchema.default('user'),
});

export const updateRoleSchema = z.object({ role: roleSchema });

export const updateActiveSchema = z.object({ isActive: z.boolean() });

export const updatePermissionsSchema = z.object({
  permissions: z.array(permissionSchema).default([]),
  deniedPermissions: z.array(permissionSchema).default([]),
});