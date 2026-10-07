import { z } from 'zod';
import { isValidNationalId } from '../lib/national-id';

export const submitCodeSchema = z.object({
  nationalId: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .pipe(z.string().regex(/^\d{10}$/, 'National ID must be 10 digits'))
    .refine((id) => isValidNationalId(id), 'کد ملی نامعتبر است / Invalid national ID'),
});

export const submitPasswordSchema = z.object({
  ticket: z.string().min(10),
  password: z.string().min(1),
});

export const completeSetupSchema = z
  .object({
    ticket: z.string().min(10),
    password: z.string(),
  })
  .superRefine((val, ctx) => {
    const checks: [boolean, string][] = [
      [val.password.length >= 8, 'حداقل ۸ کاراکتر'],
      [/[A-Z]/.test(val.password), 'حداقل یک حرف بزرگ'],
      [/[a-z]/.test(val.password), 'حداقل یک حرف کوچک'],
      [/\d/.test(val.password), 'حداقل یک رقم'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: msg });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string(),
  })
  .superRefine((val, ctx) => {
    const checks: [boolean, string][] = [
      [val.newPassword.length >= 8, 'حداقل ۸ کاراکتر'],
      [/[A-Z]/.test(val.newPassword), 'حداقل یک حرف بزرگ'],
      [/[a-z]/.test(val.newPassword), 'حداقل یک حرف کوچک'],
      [/\d/.test(val.newPassword), 'حداقل یک رقم'],
    ];
    for (const [ok, msg] of checks) {
      if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPassword'], message: msg });
    }
  });