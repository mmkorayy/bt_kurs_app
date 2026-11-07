import { after, before } from 'node:test';
import { clientRepositoryContract } from '../contract/client-repository.contract.js';
import { openTestDb, testDbEnabled, type TestDb } from '../../test-db.js';
import { PostgresClientRepository } from './client-repository.js';

let db: TestDb;
before(async () => {
  if (testDbEnabled) db = await openTestDb();
});
after(async () => {
  if (db) await db.close();
});

clientRepositoryContract(
  'postgres',
  async () => {
    await db.reset();
    return {
      repo: new PostgresClientRepository(db.pool),
      seedUser: async (id) => {
        await db.pool.query('INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, id]);
      },
    };
  },
  { skip: !testDbEnabled },
);
