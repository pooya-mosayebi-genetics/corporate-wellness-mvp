import bcrypt from 'bcrypt';
import { env } from '../config/env';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  if (password.length < 8) errors.push('حداقل ۸ کاراکتر / At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('حداقل یک حرف بزرگ / One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('حداقل یک حرف کوچک / One lowercase letter');
  if (!/\d/.test(password)) errors.push('حداقل یک رقم / One digit');
  return { valid: errors.length === 0, errors };
}