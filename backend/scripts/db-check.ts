// Veritabanı bağlantısını dener: `npm run db:check` (backend/ içinde).
// Bağlantı adresini asla yazdırmaz.
import pg from 'pg';
import { loadConfig } from '../src/config.js';

const { databaseUrl } = loadConfig(process.env);
if (!databaseUrl) {
  console.error('DATABASE_URL tanımlı değil. backend/.env dosyasını kontrol et.');
  process.exit(1);
}

/** Hata mesajında adres (ya da parolası) geçiyorsa gizler. */
function hideAddress(message: string, address: string): string {
  let safe = message.split(address).join('***');
  try {
    const { password } = new URL(address);
    if (password) safe = safe.split(decodeURIComponent(password)).join('***');
  } catch {
    // Adres çözülemezse yalnızca tam eşleşme gizlenmiş olur.
  }
  return safe;
}

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  const { rows } = await client.query('SELECT current_database() AS db');
  console.log(`Bağlantı başarılı. Veritabanı: ${rows[0].db}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Bağlantı başarısız:', hideAddress(message, databaseUrl));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
