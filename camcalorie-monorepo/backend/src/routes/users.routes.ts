import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authGuard } from '../middleware/auth-guard';
import { requirePermission } from '../middleware/permissions';
import {
  listUsers,
  createUser,
  updateRole,
  updateActive,
  resetPassword,
  updatePermissions,
  rolesCatalog,
  permissionsCatalog,
} from '../controllers/users.controller';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS' },
});

export const usersRouter = Router();

usersRouter.use(authGuard, limiter);

// کاتالوگ‌ها (برای UI ادمین)
usersRouter.get('/roles', requirePermission('access.manage'), rolesCatalog);
usersRouter.get('/permissions', requirePermission('access.manage'), permissionsCatalog);

// مدیریت کاربران
usersRouter.get('/', requirePermission('users.manage'), listUsers);
usersRouter.post('/', requirePermission('users.manage'), createUser);
usersRouter.patch('/:nationalId/role', requirePermission('access.manage'), updateRole);
usersRouter.patch('/:nationalId/active', requirePermission('users.manage'), updateActive);
usersRouter.post('/:nationalId/reset-password', requirePermission('users.manage'), resetPassword);
usersRouter.patch('/:nationalId/permissions', requirePermission('access.manage'), updatePermissions);