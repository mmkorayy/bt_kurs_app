import test from 'node:test';
import assert from 'node:assert/strict';
import { MemorySessionStore } from './session-store.js';

test('create gives a 64-character hex token that find returns', async () => {
  const store = new MemorySessionStore();
  const session = await store.create('u1');
  assert.match(session.token, /^[0-9a-f]{64}$/);
  assert.equal((await store.find(session.token))?.userId, 'u1');
});

test('two sessions get different tokens', async () => {
  const store = new MemorySessionStore();
  const a = await store.create('u1');
  const b = await store.create('u1');
  assert.notEqual(a.token, b.token);
});

test('delete removes the session', async () => {
  const store = new MemorySessionStore();
  const session = await store.create('u1');
  await store.delete(session.token);
  assert.equal(await store.find(session.token), undefined);
});
