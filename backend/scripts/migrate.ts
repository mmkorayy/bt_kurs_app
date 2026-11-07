// db/migrations/*.sql dosyalarını gerçek veritabanına uygular: `npm run db:migrate` (backend/ içinde).
// Bağlantı adresini asla yazdırmaz.
import { loadConfig } from '../src/config.js';
import { MIGRATIONS_DIR, runMigrations } from '../src/db/migrate.js';
import { createPool } from '../src/db/pool.js';

const { databaseUrl } = loadConfig(process.env);
if (!databaseUrl) {
  console.error('DATABASE_URL tanımlı değil. backend/.env dosyasını kontrol et.');
  process.exit(1);
}

const pool = createPool(databaseUrl);
try {
  const applied = await runMigrations(pool, MIGRATIONS_DIR);
  if (applied.length === 0) console.log('Yeni migration yok.');
  else for (const name of applied) console.log(`Uygulandı: ${name}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Migration başarısız (bu dosya geri alındı):', message.split(databaseUrl).join('***'));
  process.exitCode = 1;
} finally {
  await pool.end();
}
