import { Router, Request, Response } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.resolve(__dirname, '../../openapi/openapi.yaml');

router.get('/openapi.yaml', async (_req: Request, res: Response) => {
  try {
    const spec = await readFile(openApiPath, 'utf8');
    res.type('application/yaml').send(spec);
  } catch {
    res.status(500).json({ success: false, error: 'OpenAPI spec unavailable' });
  }
});

router.get('/docs', (_req: Request, res: Response) => {
  res.type('text/html').send(`<!doctype html>
<html>
  <head>
    <title>SkillBridge API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <redoc spec-url="/api/openapi.yaml"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
  </body>
</html>`);
});

export default router;
