import { z } from 'zod';
import { isValidNationalId } from '../lib/national-id';
import { normalizeRole, APP_ROLES } from '@shared/roles';

export const personnelRowSchema = z.object({
  nationalId: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{10}$/, 'National ID must be 10 digits'))
    .refine((id) => isValidNationalId(id), 'Invalid national ID'),
  fullName: z.string().min(1).max(120),
  fullNamePrefixed: z.string().max(160).nullish(),
  mobile: z
    .string()
    .max(20)
    .nullish()
    .transform((v) => (v ? v.replace(/\D/g, '').slice(0, 15) || null : null)),
  birthDate: z.string().max(20).nullish(),
  gender: z.string().max(10).nullish(),
  position: z.string().max(120).nullish(),
  department: z.string().max(120).nullish(),
  orgId: z.string().max(80).nullish(),
  role: z
    .string()
    .nullish()
    .transform((r) => (r ? normalizeRole(r) : null)),
});

export const personnelImportSchema = z.object({
  rows: z.array(personnelRowSchema).min(1).max(5000),
  defaultOrgId: z.string().max(80).optional(), // اگر orgId خالی بود
});

export type PersonnelRowInput = z.infer<typeof personnelRowSchema>;