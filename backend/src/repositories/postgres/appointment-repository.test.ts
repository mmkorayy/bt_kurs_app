import { after, before } from 'node:test';
import { appointmentRepositoryContract } from '../contract/appointment-repository.contract.js';
import { openTestDb, testDbEnabled, type TestDb } from '../../test-db.js';
import { PostgresAppointmentRepository } from './appointment-repository.js';

let db: TestDb;
before(async () => {
  // Birden fazla bağlantı: eşzamanlı kayıt testi gerçekten aynı anda çalışsın.
  if (testDbEnabled) db = await openTestDb({ max: 4 });
});
after(async () => {
  if (db) await db.close();
});

appointmentRepositoryContract(
  'postgres',
  async () => {
    await db.reset();
    return {
      repo: new PostgresAppointmentRepository(db.pool),
      seedUser: async (id) => {
        await db.pool.query('INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)', [id, `${id}@example.test`, id]);
      },
      seedClient: async (userId, clientId) => {
        await db.pool.query(
          `INSERT INTO clients (id, user_id, first_name, last_name, birth_date, gender)
           VALUES ($1, $2, 'Ad', 'Soyad', '2000-01-01', 'female')
           ON CONFLICT (id) DO NOTHING`,
          [clientId, userId],
        );
      },
    };
  },
  { skip: !testDbEnabled },
);
