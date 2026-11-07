import type pg from 'pg';
import type { Client, Gender } from '../../domain/types.js';
import type { ClientRepository } from '../types.js';

interface ClientRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  deleted_at: Date | null;
}

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    gender: row.gender,
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}

export class PostgresClientRepository implements ClientRepository {
  constructor(private readonly pool: pg.Pool) {}

  async create(client: Client): Promise<Client> {
    await this.pool.query(
      `INSERT INTO clients (id, user_id, first_name, last_name, birth_date, gender, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [client.id, client.userId, client.firstName, client.lastName, client.birthDate, client.gender, client.deletedAt],
    );
    return client;
  }

  async findById(userId: string, id: string): Promise<Client | undefined> {
    const { rows } = await this.pool.query<ClientRow>('SELECT * FROM clients WHERE user_id = $1 AND id = $2', [userId, id]);
    return rows[0] ? toClient(rows[0]) : undefined;
  }

  async listActive(userId: string): Promise<Client[]> {
    const { rows } = await this.pool.query<ClientRow>('SELECT * FROM clients WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
    return rows.map(toClient);
  }

  async update(client: Client): Promise<Client> {
    await this.pool.query(
      `UPDATE clients
          SET first_name = $3, last_name = $4, birth_date = $5, gender = $6, deleted_at = $7
        WHERE user_id = $1 AND id = $2`,
      [client.userId, client.id, client.firstName, client.lastName, client.birthDate, client.gender, client.deletedAt],
    );
    return client;
  }
}
