import type pg from 'pg';
import type { Appointment, AppointmentStatus } from '../../domain/types.js';
import type { AppointmentRepository } from '../types.js';

/** PostgreSQL hata kodu: dışlama kısıtı (randevu çakışması) ihlali. */
const EXCLUSION_VIOLATION = '23P01';

interface AppointmentRow {
  id: string;
  user_id: string;
  client_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  note: string;
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    note: row.note,
  };
}

export class PostgresAppointmentRepository implements AppointmentRepository {
  constructor(private readonly pool: pg.Pool) {}

  async findById(userId: string, id: string): Promise<Appointment | undefined> {
    const { rows } = await this.pool.query<AppointmentRow>('SELECT * FROM appointments WHERE user_id = $1 AND id = $2', [userId, id]);
    return rows[0] ? toAppointment(rows[0]) : undefined;
  }

  async listByDateRange(userId: string, from: string, to: string): Promise<Appointment[]> {
    const { rows } = await this.pool.query<AppointmentRow>(
      'SELECT * FROM appointments WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date, start_time, id',
      [userId, from, to],
    );
    return rows.map(toAppointment);
  }

  /**
   * Çakışma kontrolü veritabanındaki dışlama kısıtıdır (kontrol ve yazma tek ifade, atomik).
   * Kısıt ihlal edilirse hiçbir şey yazılmaz ve `undefined` döner.
   */
  async saveIfNoConflict(appointment: Appointment): Promise<Appointment | undefined> {
    try {
      const { rowCount } = await this.pool.query(
        `INSERT INTO appointments (id, user_id, client_id, date, start_time, end_time, status, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE
            SET client_id = EXCLUDED.client_id, date = EXCLUDED.date, start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time, status = EXCLUDED.status, note = EXCLUDED.note
          WHERE appointments.user_id = EXCLUDED.user_id`,
        [
          appointment.id,
          appointment.userId,
          appointment.clientId,
          appointment.date,
          appointment.startTime,
          appointment.endTime,
          appointment.status,
          appointment.note,
        ],
      );
      // Aynı id başka bir kullanıcıya aitse hiçbir satır yazılmaz.
      return rowCount ? appointment : undefined;
    } catch (error) {
      if ((error as { code?: string }).code === EXCLUSION_VIOLATION) return undefined;
      throw error;
    }
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query('DELETE FROM appointments WHERE user_id = $1 AND id = $2', [userId, id]);
    return (rowCount ?? 0) > 0;
  }
}
