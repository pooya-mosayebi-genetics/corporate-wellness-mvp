import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authGuard } from '../middleware/auth-guard';
import { requirePermission } from '../middleware/permissions';
import {
  importPersonnel,
  listPersonnel,
  getPersonnelByNationalId,
} from '../controllers/personnel.controller';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120, // افزایش برای ۲۰۰۰ رکورد
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS' },
});

export const personnelRouter = Router();

personnelRouter.use(authGuard, limiter);

// فقط نقش‌های دارای permission 'personnel.import' (super_admin, org_owner, org_admin, hr_admin)
personnelRouter.post('/import', requirePermission('personnel.import'), importPersonnel);

// فقط نقش‌های دارای permission 'personnel.view'
personnelRouter.get('/', requirePermission('personnel.view'), listPersonnel);

// دریافت یک رکورد (برای self-provisioning و پروفایل)
personnelRouter.get(
  '/by-national-id/:nationalId',
  requirePermission('personnel.view'),
  getPersonnelByNationalId
);