import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ACCESS_MAX_AGE_MS, REFRESH_MAX_AGE_MS } from '../lib/jwt';
import { logAudit } from '../lib/audit';
import * as authService from '../services/auth.service';
import {
  submitCodeSchema,
  submitPasswordSchema,
  completeSetupSchema,
  changePasswordSchema,
} from '../validators/auth.validator';

const isProd = env.NODE_ENV === 'production';

function clientMeta(req: Request) {
  return { ip: req.ip ?? null, ua: req.get('user-agent') ?? null };
}

function setSessionCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: ACCESS_MAX_AGE_MS,
    path: '/',
  });
  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: REFRESH_MAX_AGE_MS,
    path: '/api/auth',
  });
}

function clearSessionCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

export const submitCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = submitCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues });
      return;
    }
    const result = await authService.submitCode(parsed.data.nationalId, clientMeta(req));
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const submitPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = submitPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues });
      return;
    }
    const result = await authService.submitPassword(parsed.data.ticket, parsed.data.password, clientMeta(req));
    setSessionCookies(res, result.tokens);
    res.json({ user: result.user, tokens: result.tokens });
  } catch (e) {
    next(e);
  }
};

export const completeSetup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = completeSetupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues });
      return;
    }
    const result = await authService.completeSetup(parsed.data.ticket, parsed.data.password, clientMeta(req));
    setSessionCookies(res, result.tokens);
    res.json({ user: result.user, tokens: result.tokens });
  } catch (e) {
    next(e);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues });
      return;
    }
    const user = (req as any).user;
    const result = await authService.changePassword(
      user.nationalId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      clientMeta(req)
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fromCookie = req.cookies?.refresh_token as string | undefined;
    const fromBody = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    const token = fromCookie ?? fromBody;
    if (!token) {
      res.status(401).json({ error: 'INVALID_REFRESH' });
      return;
    }
    const result = await authService.refresh(token);
    setSessionCookies(res, result.tokens);
    res.json({ tokens: result.tokens });
  } catch (e) {
    next(e);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    await logAudit({ type: 'logout', actorId: user?.nationalId ?? 'anonymous', ...clientMeta(req) });
    clearSessionCookies(res);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const result = await authService.me(user.nationalId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};