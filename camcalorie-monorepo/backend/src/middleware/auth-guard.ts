import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { verifyAccess } from '../lib/jwt';
import { db } from '../config/db';
import { users } from '../db/schema';

export async function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const fromCookie = req.cookies?.access_token as string | undefined;
  const token = bearer ?? fromCookie;

  if (!token) {
    res.status(401).json({ error: 'NO_TOKEN' });
    return;
  }

  const payload = verifyAccess(token);
  if (!payload) {
    res.status(401).json({ error: 'INVALID_TOKEN' });
    return;
  }

  // خواندن permissions و deniedPermissions از دیتابیس
  try {
    const rows = await db.select().from(users).where(eq(users.nationalId, payload.sub)).limit(1);
    if (!rows.length) {
      res.status(401).json({ error: 'INVALID_TOKEN' });
      return;
    }
    const u = rows[0];

    (req as any).user = {
      nationalId: payload.sub,
      role: payload.role,
      permissions: u.permissions ?? [],
      deniedPermissions: u.deniedPermissions ?? [],
    };
    next();
  } catch (e) {
    next(e);
  }
}