import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  submitCode,
  submitPassword,
  completeSetup,
  changePassword,
  refresh,
  logout,
  me,
} from '../controllers/auth.controller';
import { authGuard } from '../middleware/auth-guard';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS' },
});

export const authRouter = Router();

authRouter.use(authLimiter);

authRouter.post('/submit-code', submitCode);
authRouter.post('/submit-password', submitPassword);
authRouter.post('/complete-setup', completeSetup);
authRouter.post('/change-password', authGuard, changePassword);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', authGuard, me);