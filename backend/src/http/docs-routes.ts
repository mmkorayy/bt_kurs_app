import { createRequire } from 'node:module';
import express, { Router } from 'express';

// swagger-ui-dist CommonJS bir paket; hazır derlenmiş Swagger UI dosyalarını barındırır.
const require = createRequire(import.meta.url);
const swaggerUiDist = require('swagger-ui-dist') as { getAbsoluteFSPath(): string };

const PAGE = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bookpal API belgeleri</title>
  <link rel="stylesheet" href="/docs/assets/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs/assets/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      persistAuthorization: true,
    });
  </script>
</body>
</html>
`;

/** API sözleşmesini (openapi.yaml) okuyan, "Try it out" ile denenebilen Swagger UI sayfası. */
export function createDocsRouter(specPath: string): Router {
  const router = Router();
  router.get('/openapi.yaml', (_req, res) => {
    res.sendFile(specPath);
  });
  router.use('/assets', express.static(swaggerUiDist.getAbsoluteFSPath()));
  router.get('/', (_req, res) => {
    res.type('html').send(PAGE);
  });
  return router;
}
