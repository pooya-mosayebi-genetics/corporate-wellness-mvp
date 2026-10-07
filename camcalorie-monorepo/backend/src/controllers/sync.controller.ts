import { Request, Response, NextFunction } from 'express';
import * as mealService from '../services/meal.service';
import * as analysisService from '../services/analysis.service';
import { createMealSchema, createAnalysisSchema } from '../validators/sync.validator';

function meta(req: Request) {
  return { ip: req.ip ?? null, ua: req.get('user-agent') ?? null };
}

function uid(req: Request): string {
  return (req as any).user.nationalId;
}

export const upsertMeal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createMealSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues.slice(0, 10) });
      return;
    }

    res.json(await mealService.upsertMeal(uid(req), parsed.data, meta(req)));
  } catch (e) {
    next(e);
  }
};

export const listMyMeals = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const limit = Number(q.limit) || 200;
    const offset = Number(q.offset) || 0;

    res.json(await mealService.listMyMeals(uid(req), q.from, q.to, limit, offset));
  } catch (e) {
    next(e);
  }
};

export const deleteMyMeal = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id ?? '');
    res.json(await mealService.deleteMyMeal(id, uid(req), meta(req)));
  } catch (e) {
    next(e);
  }
};

export const deleteMyMealByKey = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const key = String(req.params.key ?? '');
    if (!key) {
      res.status(400).json({
        error: 'VALIDATION',
        details: [{ message: 'missing key' }],
      });
      return;
    }

    res.json(await mealService.deleteMyMealByKey(key, uid(req), meta(req)));
  } catch (e) {
    next(e);
  }
};

export const upsertAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createAnalysisSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues.slice(0, 10) });
      return;
    }

    res.json(await analysisService.upsertAnalysis(uid(req), parsed.data, meta(req)));
  } catch (e) {
    next(e);
  }
};

export const listMyAnalyses = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const limit = Number(q.limit) || 100;
    const offset = Number(q.offset) || 0;

    res.json(await analysisService.listMyAnalyses(uid(req), limit, offset));
  } catch (e) {
    next(e);
  }
};