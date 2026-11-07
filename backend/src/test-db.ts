// Postgres testleri için geçici veritabanı alanı. Yalnızca testler kullanır (tsc derlemesine girmez).
// Gerçek DATABASE_URL'e asla dokunmaz; yalnızca TEST_DATABASE_URL kullanılır.
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { MIGRATIONS_DIR, runMigrations } from './db/migrate.js';
import { createPool } from './db/pool.js';

/** TEST_DATABASE_URL tanımlıysa Postgres testleri çalışır, yoksa atlanır. */
export const testDbEnabled = Boolean(process.env.TEST_DATABASE_URL?.trim());

export interface TestDb {
  pool: pg.Pool;
  /** Dört veri tablosunu boşaltır. */
  reset(): Promise<void>;
  /** Geçici şemayı siler ve havuzu kapatır. */
  close(): Promise<void>;
}

/** Neon'un havuzlu (`-pooler`) adresi verilirse doğrudan adrese çevirir: şema ayarı bağlantıya bağlıdır. */
function directUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hostname = parsed.hostname.replace('-pooler', '');
  return parsed.toString();
}

export async function openTestDb(options: { migrate?: boolean; max?: number } = {}): Promise<TestDb> {
  const url = directUrl(process.env.TEST_DATABASE_URL!.trim());
  const schema = `test_${randomBytes(6).toString('hex')}`;

  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
  } finally {
    await admin.end();
  }

  // Varsayılan tek bağlantı; eşzamanlılık testleri `max` ile birden fazla bağlantı ister.
  const pool = createPool(url, { max: options.max ?? 1 });
  pool.on('connect', (client) => {
    client.query(`SET search_path TO "${schema}", public`).catch(() => {});
  });
  try {
    if (options.migrate !== false) await runMigrations(pool, MIGRATIONS_DIR);
  } catch (error) {
    await dropSchema(pool, schema);
    throw error;
  }

  return {
    pool,
    reset: async () => {
      await pool.query('TRUNCATE appointments, clients, sessions, users CASCADE');
    },
    close: () => dropSchema(pool, schema),
  };
}

async function dropSchema(pool: pg.Pool, schema: string): Promise<void> {
  try {
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await pool.end();
  }
}

/** Geçici alan açar, `run`'ı çalıştırır ve hata olsa da kapatır. */
export async function withTestDb(run: (pool: pg.Pool) => Promise<void>, options: { migrate?: boolean } = {}): Promise<void> {
  const db = await openTestDb(options);
  try {
    await run(db.pool);
  } finally {
    await db.close();
  }
}
