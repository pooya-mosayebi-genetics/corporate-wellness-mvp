import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';

import { authRouter } from './routes/auth.routes';
import { personnelRouter } from './routes/personnel.routes';
import { usersRouter } from './routes/users.routes';
import { syncRouter } from './routes/sync.routes';

const app = express();

// پشت reverse proxy در production؛ برای ثبت IP واقعی کاربر
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(cookieParser());

// برای import پرسنل با حجم بالا و sync داده‌های کاربر
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use(pinoHttp({ logger }));
app.use(requestLogger);

// Rate limit عمومی API
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/personnel', personnelRouter);
app.use('/api/users', usersRouter);

// Sync routes:
// POST/GET/DELETE /api/meals
// POST/GET /api/body-analyses
app.use('/api', syncRouter);

// 404 JSON
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});

app.use(errorHandler);

export default app;