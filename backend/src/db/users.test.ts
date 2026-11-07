import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_USERS } from '../auth/demo-identity-provider.js';
import { testDbEnabled, withTestDb } from '../test-db.js';
import { upsertUsers } from './users.js';

const skip = !testDbEnabled;

test('upsertUsers twice keeps one row per user', { skip }, async () => {
  await withTestDb(async (pool) => {
    await upsertUsers(pool, DEMO_USERS);
    await upsertUsers(pool, DEMO_USERS);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
    assert.equal(rows[0].n, DEMO_USERS.length);
  });
});

test('upsertUsers updates a changed display name and email', { skip }, async () => {
  await withTestDb(async (pool) => {
    await upsertUsers(pool, [{ id: 'u1', email: 'eski@example.test', displayName: 'Eski Ad' }]);
    await upsertUsers(pool, [{ id: 'u1', email: 'yeni@example.test', displayName: 'Yeni Ad' }]);
    const { rows } = await pool.query('SELECT email, display_name FROM users WHERE id = $1', ['u1']);
    assert.deepEqual(rows, [{ email: 'yeni@example.test', display_name: 'Yeni Ad' }]);
  });
});

test('upsertUsers with no users does nothing', { skip }, async () => {
  await withTestDb(async (pool) => {
    await upsertUsers(pool, []);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
    assert.equal(rows[0].n, 0);
  });
});
