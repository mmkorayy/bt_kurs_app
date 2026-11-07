import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { testDbEnabled, withTestDb } from '../test-db.js';
import { createPool } from './pool.js';
import { MIGRATIONS_DIR, runMigrations } from './migrate.js';

const skip = !testDbEnabled;

test('the first migration creates every table and a second run does nothing', { skip }, async () => {
  await withTestDb(async (pool) => {
    const { rows } = await pool.query(
      `select table_name from information_schema.tables where table_schema = current_schema() order by table_name`,
    );
    const names = rows.map((row) => row.table_name);
    for (const table of ['appointments', 'clients', 'schema_migrations', 'sessions', 'users']) {
      assert.ok(names.includes(table), `missing table ${table}`);
    }
    assert.deepEqual(await runMigrations(pool, MIGRATIONS_DIR), []);
  });
});

test('a migration that fails halfway is rolled back and not recorded', { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookpal-migrations-'));
  try {
    fs.writeFileSync(path.join(dir, '001_ok.sql'), 'create table t1(id int);');
    fs.writeFileSync(path.join(dir, '002_bad.sql'), 'create table t2(id int); select 1/0;');
    await withTestDb(async (pool) => {
      await assert.rejects(runMigrations(pool, dir));
      const tables = await pool.query(
        `select table_name from information_schema.tables where table_schema = current_schema()`,
      );
      const names = tables.rows.map((row) => row.table_name);
      assert.ok(names.includes('t1'));
      assert.ok(!names.includes('t2'));
      const recorded = await pool.query('select name from schema_migrations order by name');
      assert.deepEqual(
        recorded.rows.map((row) => row.name),
        ['001_ok.sql'],
      );
    }, { migrate: false });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('dates and times come back as plain text, not Date objects', { skip }, async () => {
  const pool = createPool(process.env.TEST_DATABASE_URL!.replace('-pooler', ''));
  try {
    const { rows } = await pool.query(`select '2000-01-01'::date as d, '09:30'::time as t`);
    assert.deepEqual(rows[0], { d: '2000-01-01', t: '09:30' });
  } finally {
    await pool.end();
  }
});
