import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../domain/errors.js';
import type { ClientInput } from '../domain/types.js';
import { MemoryClientRepository } from '../repositories/memory/client-repository.js';
import { ClientService } from './client-service.js';

const elif: ClientInput = { firstName: 'Elif', lastName: 'Yıldız', birthDate: '1990-05-17', gender: 'female' };

function setup() {
  return new ClientService(new MemoryClientRepository(), () => new Date('2026-11-01T10:00:00.000Z'));
}

function isNotFound(e: unknown): boolean {
  return e instanceof AppError && e.status === 404 && e.code === 'not_found';
}

test('a created client can be read back by its owner', async () => {
  const service = setup();
  const created = await service.create('u1', elif);
  assert.equal(created.deletedAt, null);
  assert.equal((await service.get('u1', created.id)).firstName, 'Elif');
});

test('another user gets not found for the client', async () => {
  const service = setup();
  const created = await service.create('u1', elif);
  await assert.rejects(() => service.get('u2', created.id), isNotFound);
});

test('search finds İlker with "ilker" and ışık with "IŞIK"', async () => {
  const service = setup();
  await service.create('u1', { ...elif, firstName: 'İlker', lastName: 'Demir' });
  await service.create('u1', { ...elif, firstName: 'Ece', lastName: 'ışık' });
  assert.deepEqual((await service.search('u1', 'ilker')).map((c) => c.firstName), ['İlker']);
  assert.deepEqual((await service.search('u1', 'IŞIK')).map((c) => c.firstName), ['Ece']);
});

test('search matches across first and last name', async () => {
  const service = setup();
  await service.create('u1', elif);
  assert.equal((await service.search('u1', 'elif yıl')).length, 1);
});

test('an empty search lists all active clients sorted by last then first name', async () => {
  const service = setup();
  await service.create('u1', { ...elif, firstName: 'Zeynep', lastName: 'Aydın' });
  await service.create('u1', { ...elif, firstName: 'Ali', lastName: 'Aydın' });
  await service.create('u1', { ...elif, firstName: 'Can', lastName: 'Çelik' });
  const names = (await service.search('u1')).map((c) => `${c.firstName} ${c.lastName}`);
  assert.deepEqual(names, ['Ali Aydın', 'Zeynep Aydın', 'Can Çelik']);
});

test('search never returns another user clients', async () => {
  const service = setup();
  await service.create('u1', elif);
  assert.deepEqual(await service.search('u2'), []);
});

test('update changes only the given fields', async () => {
  const service = setup();
  const created = await service.create('u1', elif);
  const updated = await service.update('u1', created.id, { lastName: 'Kaya' });
  assert.equal(updated.lastName, 'Kaya');
  assert.equal(updated.firstName, 'Elif');
});

test('softDelete hides the client and records the clock time', async () => {
  const repo = new MemoryClientRepository();
  const service = new ClientService(repo, () => new Date('2026-11-01T10:00:00.000Z'));
  const created = await service.create('u1', elif);
  await service.softDelete('u1', created.id);
  assert.deepEqual(await service.search('u1'), []);
  await assert.rejects(() => service.get('u1', created.id), isNotFound);
  assert.equal((await repo.findById('u1', created.id))?.deletedAt, '2026-11-01T10:00:00.000Z');
});

test('deleting twice gives not found', async () => {
  const service = setup();
  const created = await service.create('u1', elif);
  await service.softDelete('u1', created.id);
  await assert.rejects(() => service.softDelete('u1', created.id), isNotFound);
});
