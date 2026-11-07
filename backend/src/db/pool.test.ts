import assert from 'node:assert/strict';
import test from 'node:test';
import { createPool } from './pool.js';

// Neon boştaki bağlantıları kapatır; pg bunu havuzda 'error' olayı olarak bildirir.
// Dinleyici yoksa Node süreci çöker.
test('the pool listens for idle connection errors so the server does not crash', async () => {
  const pool = createPool('postgres://u:p@127.0.0.1:1/db');
  try {
    assert.ok(pool.listenerCount('error') > 0);
  } finally {
    await pool.end();
  }
});
