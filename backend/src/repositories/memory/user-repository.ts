import type { ReminderMinutes, User } from '../../domain/types.js';
import type { UserRepository, UserWithSettings } from '../types.js';

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  private readonly reminderSettings = new Map<string, ReminderMinutes | null>();

  constructor(initialUsers: User[] = []) {
    for (const u of initialUsers) {
      this.users.set(u.id, u);
      this.reminderSettings.set(u.id, 30); // Varsayılan 30 dk
    }
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getReminderSettings(userId: string): Promise<ReminderMinutes | null> {
    return this.reminderSettings.has(userId) ? this.reminderSettings.get(userId)! : 30;
  }

  async updateReminderSettings(userId: string, minutes: ReminderMinutes | null): Promise<ReminderMinutes | null> {
    this.reminderSettings.set(userId, minutes);
    return minutes;
  }

  async listUsersWithRemindersEnabled(): Promise<UserWithSettings[]> {
    const list: UserWithSettings[] = [];
    for (const user of this.users.values()) {
      const minutes = await this.getReminderSettings(user.id);
      if (minutes !== null) {
        list.push({ ...user, reminderMinutesBefore: minutes });
      }
    }
    return list;
  }
}
