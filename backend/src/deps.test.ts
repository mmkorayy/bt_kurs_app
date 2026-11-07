import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDeps } from './deps.js';
import { ELIF, startTestServer } from './test-support.js';

test('without DATABASE_URL the deps work on memory and a demo login succeeds', async (t) => {
  const server = startTestServer(await buildDeps({}));
  t.after(() => server.close());
  const { token } = await server.login(ELIF);
  assert.match(token, /^[0-9a-f]{64}$/);
});

test('an empty DATABASE_URL also means memory', async () => {
  await buildDeps({ DATABASE_URL: '   ' });
});

test('an unreachable DATABASE_URL stops start-up with a clear message that hides the address', async () => {
  await assert.rejects(buildDeps({ DATABASE_URL: 'postgres://kullanici:gizli@127.0.0.1:1/db' }), (error: Error) => {
    assert.match(error.message, /Veritabanına bağlanılamadı/);
    assert.ok(!error.message.includes('gizli'), 'password leaked');
    assert.ok(!error.message.includes('kullanici'), 'user name leaked');
    assert.ok(!error.message.includes('127.0.0.1'), 'address leaked');
    return true;
  });
});
