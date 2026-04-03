import { NextFunction, Request, Response } from 'express';
import { recordRequestMetric } from '../config/metrics.js';

const getRouteLabel = (req: Request): string => {
  const routePath = req.route?.path;

  if (typeof routePath === 'string') {
    return `${req.baseUrl}${routePath}` || req.originalUrl;
  }

  if (Array.isArray(routePath)) {
    return `${req.baseUrl}${routePath[0]}` || req.originalUrl;
  }

  return req.originalUrl;
};

export const observabilityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    recordRequestMetric({
      method: req.method,
      route: getRouteLabel(req),
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
};