import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  FRONTEND_URL: z.string().url().default('http://localhost:8081'),
  STORAGE_PATH: z.string().default('./storage/private'),
  MAX_UPLOAD_SIZE_MB: z.string().default('10').transform(Number),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

// Load .env file
import { config } from 'dotenv';
config();

export const env = envSchema.parse(process.env);