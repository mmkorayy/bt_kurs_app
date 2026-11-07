// Bellek ve Postgres danışan depolarının ikisinin de geçmesi gereken ortak davranış testleri.
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Client } from '../../domain/types.js';
import type { ClientRepository } from '../types.js';

/** Postgres'te yabancı anahtar için `users` satırı yazar; bellekte bir şey yapmaz. */
export interface RepoContext {
  seedUser(id: string): Promise<void>;
}

const client = (over: Partial<Client> = {}): Client => ({
  id: 'c1',
  userId: 'u1',
  firstName: 'Elif',
  lastName: 'Yıldız',
  birthDate: '2000-01-01',
  gender: 'female',
  deletedAt: null,
  ...over,
});

export function clientRepositoryContract(
  label: string,
  setup: () => Promise<{ repo: ClientRepository } & RepoContext>,
  options: { skip?: boolean } = {},
): void {
  const { skip = false } = options;

  test(`${label}: a created client is found again, birth date as plain text`, { skip }, async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await repo.create(client());
    assert.deepEqual(await repo.findById('u1', 'c1'), client());
  });

  test(`${label}: a client is invisible to another user`, { skip }, async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await seedUser('u2');
    await repo.create(client());
    assert.equal(await repo.findById('u2', 'c1'), undefined);
    assert.deepEqual(await repo.listActive('u2'), []);
  });

  test(`${label}: listActive returns only that user's clients that are not deleted`, { skip }, async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await seedUser('u2');
    await repo.create(client({ id: 'a' }));
    await repo.create(client({ id: 'b', deletedAt: '2026-11-01T10:00:00.000Z' }));
    await repo.create(client({ id: 'c', userId: 'u2' }));
    assert.deepEqual((await repo.listActive('u1')).map((c) => c.id), ['a']);
  });

  test(`${label}: a deleted client leaves listActive but findById still returns it`, { skip }, async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await repo.create(client());
    await repo.update(client({ deletedAt: '2026-11-01T10:00:00.000Z' }));
    assert.deepEqual(await repo.listActive('u1'), []);
    assert.equal((await repo.findById('u1', 'c1'))?.deletedAt, '2026-11-01T10:00:00.000Z');
  });

  test(`${label}: update saves a changed name`, { skip }, async () => {
    const { repo, seedUser } = await setup();
    await seedUser('u1');
    await repo.create(client());
    const saved = await repo.update(client({ lastName: 'Kaya' }));
    assert.equal(saved.lastName, 'Kaya');
    assert.equal((await repo.findById('u1', 'c1'))?.lastName, 'Kaya');
  });
}
