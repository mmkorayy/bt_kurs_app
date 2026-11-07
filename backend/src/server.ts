import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { buildDeps } from './deps.js';
import { resolveStaticDir } from './static-dir.js';

const config = loadConfig(process.env);
// Hem src/ (geliştirme) hem dist/ (derlenmiş) bir üst klasörde backend/, onun da üstünde repo kökü vardır.
const staticDir = resolveStaticDir(path.resolve(import.meta.dirname, '../..'));
const specPath = path.resolve(import.meta.dirname, '../../api-contract/openapi.yaml');

let deps;
try {
  deps = await buildDeps(process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

createApp({ ...deps, staticDir, docs: { specPath } }).listen(config.port, () => {
  console.log(`Bookpal http://localhost:${config.port} adresinde çalışıyor`);
  if (!fs.existsSync(path.join(staticDir, 'index.html'))) {
    console.log('Ön yüz derlenmemiş: sayfalar için önce frontend/ içinde derleme çalıştırın (API çalışmaya devam eder).');
  }
  console.log(config.databaseUrl ? 'Veriler Postgres veritabanında tutuluyor.' : 'DATABASE_URL yok: veriler bellekte tutuluyor (sunucu yeniden başlayınca silinir).');
  if (!config.production) console.log(`API belgeleri http://localhost:${config.port}/docs adresinde`);
});
