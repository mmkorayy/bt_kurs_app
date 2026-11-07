import fs from 'node:fs';
import path from 'node:path';
import type pg from 'pg';

/** Repo kökündeki `db/migrations`; hem `src/db/` hem `dist/db/` üç klasör yukarıda repo köküne çıkar. */
export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../../db/migrations');

/**
 * `dir` içindeki `.sql` dosyalarını ada göre sırayla uygular. Her dosya tek bir transaction'dadır:
 * hata olursa o dosya geri alınır, kayda geçmez ve çalıştırıcı durur.
 * Bu çalışmada yeni uygulanan dosya adlarını döndürür.
 */
export async function runMigrations(pool: pg.Pool, dir: string): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  const applied = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((row) => row.name as string));
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const done: string[] = [];
  const client = await pool.connect();
  try {
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      }
      done.push(file);
    }
  } finally {
    client.release();
  }
  return done;
}
