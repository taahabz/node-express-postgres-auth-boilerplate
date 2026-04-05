import express, { Router, Request, Response } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import swaggerUiDist from 'swagger-ui-dist';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerUiPath = swaggerUiDist.getAbsoluteFSPath();

const openApiPathCandidates = [
  path.resolve(__dirname, '../../openapi/openapi.yaml'),
  path.resolve(__dirname, '../../../openapi/openapi.yaml'),
  path.resolve(process.cwd(), 'openapi/openapi.yaml'),
  path.resolve(process.cwd(), 'backend/openapi/openapi.yaml'),
];

const loadOpenApiSpec = async (): Promise<string> => {
  let lastError: unknown;

  for (const openApiPath of openApiPathCandidates) {
    try {
      return await readFile(openApiPath, 'utf8');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

router.use('/docs/assets', express.static(swaggerUiPath));

router.get('/docs/swagger-init.js', (_req: Request, res: Response) => {
  res.type('application/javascript').send(`window.ui = SwaggerUIBundle({
  url: '/api/openapi.yaml',
  dom_id: '#swagger-ui',
  deepLinking: true,
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
  layout: 'BaseLayout'
});`);
});

router.get('/openapi.yaml', async (_req: Request, res: Response) => {
  try {
    const spec = await loadOpenApiSpec();
    res.type('application/yaml').send(spec);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'OpenAPI spec unavailable',
      ...(env.NODE_ENV !== 'production' && {
        details: error instanceof Error ? error.message : 'Unknown read error',
      }),
    });
  }
});

router.get('/docs', (_req: Request, res: Response) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );

  res.type('text/html').send(`<!doctype html>
<html>
  <head>
    <title>SkillBridge API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="/api/docs/assets/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/assets/swagger-ui-bundle.js"></script>
    <script src="/api/docs/assets/swagger-ui-standalone-preset.js"></script>
    <script src="/api/docs/swagger-init.js"></script>
  </body>
</html>`);
});

export default router;
