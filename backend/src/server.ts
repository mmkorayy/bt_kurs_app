import path from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { buildDeps } from './deps.js';
import { resolveStaticDir } from './static-dir.js';

const config = loadConfig(process.env);
// Hem src/ (geliştirme) hem dist/ (derlenmiş) bir üst klasörde backend/, onun da üstünde repo kökü vardır.
const staticDir = resolveStaticDir(path.resolve(import.meta.dirname, '../..'));
const specPath = path.resolve(import.meta.dirname, '../../api-contract/openapi.yaml');

createApp({ ...buildDeps(process.env), staticDir, docs: { specPath } }).listen(config.port, () => {
  console.log(`Bookpal http://localhost:${config.port} adresinde çalışıyor`);
  if (!config.production) console.log(`API belgeleri http://localhost:${config.port}/docs adresinde`);
});
