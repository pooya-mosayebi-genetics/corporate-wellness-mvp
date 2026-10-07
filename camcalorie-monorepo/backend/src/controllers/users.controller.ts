import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service';
import {
  createUserSchema,
  updateRoleSchema,
  updateActiveSchema,
  updatePermissionsSchema,
} from '../validators/users.validator';

function actorMeta(req: Request) {
  return { ip: req.ip ?? null, ua: req.get('user-agent') ?? null };
}

function actorId(req: Request): string {
  return (req as any).user.nationalId;
}

function nid(req: Request): string {
  return String(req.params.nationalId ?? '').replace(/\D/g, '');
}

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
    res.json(await usersService.listUsers(search, limit, offset));
  } catch (e) {
    next(e);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues.slice(0, 10) });
      return;
    }
    res.status(201).json(await usersService.createUser(parsed.data.nationalId, parsed.data.role, actorId(req), actorMeta(req)));
  } catch (e) {
    next(e);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues });
      return;
    }
    res.json(await usersService.setRole(nid(req), parsed.data.role, actorId(req), actorMeta(req)));
  } catch (e) {
    next(e);
  }
};

export const updateActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateActiveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues });
      return;
    }
    res.json(await usersService.setActive(nid(req), parsed.data.isActive, actorId(req), actorMeta(req)));
  } catch (e) {
    next(e);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(await usersService.resetPassword(nid(req), actorId(req), actorMeta(req)));
  } catch (e) {
    next(e);
  }
};

export const updatePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updatePermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION', details: parsed.error.issues.slice(0, 10) });
      return;
    }
    res.json(
      await usersService.setPermissions(
        nid(req),
        parsed.data.permissions,
        parsed.data.deniedPermissions,
        actorId(req),
        actorMeta(req)
      )
    );
  } catch (e) {
    next(e);
  }
};

export const rolesCatalog = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ roles: usersService.rolesCatalog() });
  } catch (e) {
    next(e);
  }
};

export const permissionsCatalog = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ permissions: usersService.permissionsCatalog() });
  } catch (e) {
    next(e);
  }
};