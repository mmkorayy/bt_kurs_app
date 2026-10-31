import test from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '../../domain/types.js';
import { MemoryClientRepository } from './client-repository.js';

const client = (over: Partial<Client> = {}): Client => ({
  id: 'c1',
  userId: 'u1',
  firstName: 'Elif',
  lastName: 'Yıldız',
  birthDate: '1990-05-17',
  gender: 'female',
  deletedAt: null,
  ...over,
});

test('a client is invisible to another user', async () => {
  const repo = new MemoryClientRepository();
  await repo.create(client());
  assert.equal(await repo.findById('u2', 'c1'), undefined);
  assert.deepEqual(await repo.listActive('u2'), []);
  assert.equal((await repo.findById('u1', 'c1'))?.firstName, 'Elif');
});

test('listActive skips deleted clients while findById still returns them', async () => {
  const repo = new MemoryClientRepository();
  await repo.create(client({ id: 'a' }));
  await repo.create(client({ id: 'b', deletedAt: '2026-11-01T10:00:00.000Z' }));
  assert.deepEqual((await repo.listActive('u1')).map((c) => c.id), ['a']);
  assert.equal((await repo.findById('u1', 'b'))?.deletedAt, '2026-11-01T10:00:00.000Z');
});

test('update replaces the stored client', async () => {
  const repo = new MemoryClientRepository();
  await repo.create(client());
  await repo.update(client({ lastName: 'Kaya' }));
  assert.equal((await repo.findById('u1', 'c1'))?.lastName, 'Kaya');
});
