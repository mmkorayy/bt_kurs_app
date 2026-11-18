import type { ReminderNotification } from '../../domain/types.js';
import type { ReminderNotificationRepository } from '../types.js';

export class MemoryReminderNotificationRepository implements ReminderNotificationRepository {
  private readonly notifications = new Map<string, ReminderNotification>();

  async create(notification: ReminderNotification): Promise<ReminderNotification> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async listByUser(userId: string, limit = 50): Promise<ReminderNotification[]> {
    return [...this.notifications.values()]
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, limit);
  }
}
