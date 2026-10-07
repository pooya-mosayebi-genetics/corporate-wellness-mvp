import { db } from '../config/db';
import { auditLogs } from '../db/schema';
import { logger } from './logger';

export interface AuditInput {
  type: string;
  actorId: string;
  targetId?: string | null;
  meta?: string | null;
  ip?: string | null;
  ua?: string | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      type: input.type,
      actorId: input.actorId,
      targetId: input.targetId ?? null,
      meta: input.meta ?? null,
      ipAddress: input.ip ?? null,
      userAgent: input.ua ?? null,
    });
  } catch (err) {
    logger.error({ err }, 'Audit write failed');
  }
}