import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.get('/db', async (_req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    res.json({
      success: true,
      data: { status: 'ok', db: result?.[0]?.ok === 1 ? 'up' : 'unknown' },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'database check failed',
      ...(env.NODE_ENV !== 'production' && { details: (error as Error).message }),
    });
  }
});

export default router;
