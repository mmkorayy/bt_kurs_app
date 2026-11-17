import type pg from 'pg';
import type { ReminderMinutes, User } from '../../domain/types.js';
import type { UserRepository, UserWithSettings } from '../types.js';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  reminder_minutes_before: number | null;
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findById(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows[0]) return undefined;
    return {
      id: rows[0].id,
      email: rows[0].email,
      displayName: rows[0].display_name,
    };
  }

  async getReminderSettings(userId: string): Promise<ReminderMinutes | null> {
    const { rows } = await this.pool.query<{ reminder_minutes_before: number | null }>(
      'SELECT reminder_minutes_before FROM users WHERE id = $1',
      [userId],
    );
    if (!rows[0]) return 30;
    return (rows[0].reminder_minutes_before as ReminderMinutes) ?? null;
  }

  async updateReminderSettings(userId: string, minutes: ReminderMinutes | null): Promise<ReminderMinutes | null> {
    await this.pool.query('UPDATE users SET reminder_minutes_before = $1 WHERE id = $2', [minutes, userId]);
    return minutes;
  }

  async listUsersWithRemindersEnabled(): Promise<UserWithSettings[]> {
    const { rows } = await this.pool.query<UserRow>(
      'SELECT * FROM users WHERE reminder_minutes_before IS NOT NULL',
    );
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      reminderMinutesBefore: (r.reminder_minutes_before as ReminderMinutes) ?? null,
    }));
  }
}
