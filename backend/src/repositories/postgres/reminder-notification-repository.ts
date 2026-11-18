import type pg from 'pg';
import type { ReminderNotification } from '../../domain/types.js';
import type { ReminderNotificationRepository } from '../types.js';

interface NotificationRow {
  id: string;
  user_id: string;
  appointment_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: string;
}

function toNotification(row: NotificationRow): ReminderNotification {
  return {
    id: row.id,
    userId: row.user_id,
    appointmentId: row.appointment_id,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    sentAt: row.sent_at,
  };
}

export class PostgresReminderNotificationRepository implements ReminderNotificationRepository {
  constructor(private readonly pool: pg.Pool) {}

  async create(notification: ReminderNotification): Promise<ReminderNotification> {
    await this.pool.query(
      `INSERT INTO reminder_notifications (id, user_id, appointment_id, recipient_email, subject, body, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        notification.id,
        notification.userId,
        notification.appointmentId,
        notification.recipientEmail,
        notification.subject,
        notification.body,
        notification.sentAt,
      ],
    );
    return notification;
  }

  async listByUser(userId: string, limit = 50): Promise<ReminderNotification[]> {
    const { rows } = await this.pool.query<NotificationRow>(
      `SELECT * FROM reminder_notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT $2`,
      [userId, limit],
    );
    return rows.map(toNotification);
  }
}
