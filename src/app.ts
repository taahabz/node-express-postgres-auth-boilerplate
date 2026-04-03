import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';
import { env } from './config/env.js';
import { observabilityMiddleware } from './middleware/observability.middleware.js';

export const createApp = (): Express => {
  const app = express();

  // Trust one proxy hop (ALB / reverse proxy) in production.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin:
        env.NODE_ENV === 'production'
          ? env.CORS_ORIGIN?.split(',').map((origin) => origin.trim())
          : true,
      credentials: true,
    })
  );

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Logging
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(observabilityMiddleware);

  // Rate limiting
  app.use(apiLimiter);

  // Routes
  app.use('/api', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
