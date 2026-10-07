import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { systemSettings } from '../db/schema';

const DEFAULTS: Record<string, { value: any; description: string }> = {
  self_provision: {
    value: { enabled: true },
    description: 'Allow personnel to self-register on first login',
  },
};

export async function getSetting<T = any>(key: string): Promise<T> {
  const rows = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  if (rows.length) return rows[0].value as T;

  const def = DEFAULTS[key];
  if (!def) throw new Error(`Unknown setting: ${key}`);

  await db
    .insert(systemSettings)
    .values({ key, value: def.value, description: def.description })
    .onConflictDoNothing();

  return def.value as T;
}

export async function setSetting(key: string, value: any, description?: string): Promise<void> {
  await db
    .insert(systemSettings)
    .values({ key, value, description })
    .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: new Date() } });
}

export async function isSelfProvisionEnabled(): Promise<boolean> {
  const v = await getSetting<{ enabled: boolean }>('self_provision');
  return !!v?.enabled;
}