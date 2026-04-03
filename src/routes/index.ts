import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import metricsRoutes from './metrics.routes.js';
import docsRoutes from './docs.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/metrics', metricsRoutes);
router.use('/', docsRoutes);

export default router;
