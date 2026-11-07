// Bellek ve Postgres oturum depolarının ikisinin de geçmesi gereken ortak davranış testleri.
import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionStore } from '../types.js';
import type { RepoContext } from './client-repository.contract.js';

export function sessionStoreContract(
  label: string,
  setup: () => Promise<{ store: SessionStore } & RepoContext>,
  options: { skip?: boolean } = {},
): void {
  const { skip = false } = options;

  test(`${label}: a created session is found again with the same data`, { skip }, async () => {
    const { store, seedUser } = await setup();
    await seedUser('u1');
    const session = await store.create('u1');
    assert.match(session.token, /^[0-9a-f]{64}$/);
    assert.equal(session.userId, 'u1');
    assert.match(session.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.deepEqual(await store.find(session.token), session);
  });

  test(`${label}: two sessions get different tokens`, { skip }, async () => {
    const { store, seedUser } = await setup();
    await seedUser('u1');
    const a = await store.create('u1');
    const b = await store.create('u1');
    assert.notEqual(a.token, b.token);
    assert.equal((await store.find(a.token))?.token, a.token);
    assert.equal((await store.find(b.token))?.token, b.token);
  });

  test(`${label}: a deleted session cannot be found`, { skip }, async () => {
    const { store, seedUser } = await setup();
    await seedUser('u1');
    const session = await store.create('u1');
    await store.delete(session.token);
    assert.equal(await store.find(session.token), undefined);
  });

  test(`${label}: an unknown or empty token finds nothing and never throws`, { skip }, async () => {
    const { store } = await setup();
    assert.equal(await store.find('yok'), undefined);
    assert.equal(await store.find(''), undefined);
  });

  test(`${label}: deleting an unknown token does not throw`, { skip }, async () => {
    const { store } = await setup();
    await store.delete('yok');
    await store.delete('');
  });
}
