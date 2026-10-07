import app from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
});