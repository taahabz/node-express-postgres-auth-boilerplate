import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/authorize.middleware.js';
import { getMetricsSnapshot } from '../config/metrics.js';

const router = Router();

router.get('/', authenticate, requireRoles('ADMIN'), (_req, res) => {
  res.json({
    success: true,
    data: getMetricsSnapshot(),
  });
});

export default router;