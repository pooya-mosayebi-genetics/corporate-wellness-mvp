import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { AppError, AUTH_MESSAGES } from '../lib/errors';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'VALIDATION', details: err.issues });
  }

  if (err instanceof AppError) {
    const [code, param] = err.code.split(':');
    const info = AUTH_MESSAGES[code];
    if (info) {
      const fa = param ? info.fa.replace('{n}', param) : info.fa;
      const en = param ? info.en.replace('{n}', param) : info.en;
      return res.status(info.status).json({ error: code, fa, en });
    }
    return res.status(err.status).json({ error: code });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  return res.status(500).json({
    error: 'INTERNAL',
    fa: 'خطای داخلی سرور',
    en: env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error)?.message,
  });
}