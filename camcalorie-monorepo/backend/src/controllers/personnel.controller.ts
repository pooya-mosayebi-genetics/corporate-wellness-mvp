import { Request, Response, NextFunction } from 'express';
import { personnelImportSchema } from '../validators/personnel.validator';
import * as personnelService from '../services/personnel.service';

export const importPersonnel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = personnelImportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues.slice(0, 20) });
      return;
    }
    const user = (req as any).user;
    const result = await personnelService.importPersonnel(
      parsed.data.rows,
      user.nationalId,
      { ip: req.ip ?? null, ua: req.get('user-agent') ?? null },
      parsed.data.defaultOrgId
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const listPersonnel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const search = rawSearch ? rawSearch.replace(/\D/g, '') || rawSearch : undefined;
    const orgId = typeof req.query.orgId === 'string' ? req.query.orgId : undefined;

    const result = await personnelService.listPersonnel(search, limit, offset, orgId);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const getPersonnelByNationalId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nationalId = req.params.nationalId?.replace(/\D/g, '');
    if (!nationalId || nationalId.length !== 10) {
      res.status(400).json({ error: 'Invalid national ID' });
      return;
    }
    const result = await personnelService.getPersonnelByNationalId(nationalId);
    if (!result) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }
    res.json(result);
  } catch (e) {
    next(e);
  }
};