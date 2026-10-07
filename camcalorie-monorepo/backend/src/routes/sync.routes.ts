import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authGuard } from '../middleware/auth-guard';
import { requirePermission } from '../middleware/permissions';
import {
  upsertMeal,
  listMyMeals,
  deleteMyMeal,
  deleteMyMealByKey,
  upsertAnalysis,
  listMyAnalyses,
} from '../controllers/sync.controller';

// ثبت دادهٔ کاربر: محدودتر از عمومی (ضد spam)
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS' },
});

const readLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS' },
});

export const syncRouter = Router();

syncRouter.use(authGuard);

/* ── Meals ── */

syncRouter.post(
  '/meals',
  writeLimiter,
  requirePermission('meal.self.log', ['self']),
  upsertMeal,
);

syncRouter.get(
  '/meals',
  readLimiter,
  requirePermission('meal.self.log', ['self']),
  listMyMeals,
);

// ⚠️ این مسیر باید قبل از /meals/:id باشد
syncRouter.delete(
  '/meals/by-key/:key',
  writeLimiter,
  requirePermission('meal.self.log', ['self']),
  deleteMyMealByKey,
);

syncRouter.delete(
  '/meals/:id',
  writeLimiter,
  requirePermission('meal.self.log', ['self']),
  deleteMyMeal,
);

/* ── Body Analyses ── */

syncRouter.post(
  '/body-analyses',
  writeLimiter,
  requirePermission('analysis.upload', ['self']),
  upsertAnalysis,
);

syncRouter.get(
  '/body-analyses',
  readLimiter,
  requirePermission('analysis.view', ['self']),
  listMyAnalyses,
);