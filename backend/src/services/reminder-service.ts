import { randomUUID } from 'node:crypto';
import type { AiAssistant } from '../ai/ai-assistant.js';
import type { ReminderMinutes, ReminderNotification } from '../domain/types.js';
import type {
  AppointmentRepository,
  ClientRepository,
  ReminderNotificationRepository,
  UserRepository,
} from '../repositories/types.js';
import type { EmailSender } from './email-sender.js';
import { istanbulMinutes, istanbulParts } from './istanbul-time.js';

export class ReminderService {
  constructor(
    private readonly users: UserRepository,
    private readonly appointments: AppointmentRepository,
    private readonly clients: ClientRepository,
    private readonly notifications: ReminderNotificationRepository,
    private readonly ai: AiAssistant,
    private readonly emailSender: EmailSender,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getSettings(userId: string): Promise<{ reminderMinutesBefore: ReminderMinutes | null }> {
    const minutes = await this.users.getReminderSettings(userId);
    return { reminderMinutesBefore: minutes };
  }

  async updateSettings(
    userId: string,
    reminderMinutesBefore: ReminderMinutes | null,
  ): Promise<{ reminderMinutesBefore: ReminderMinutes | null }> {
    const updated = await this.users.updateReminderSettings(userId, reminderMinutesBefore);
    return { reminderMinutesBefore: updated };
  }

  async listSent(userId: string, limit = 50): Promise<ReminderNotification[]> {
    return this.notifications.listByUser(userId, limit);
  }

  async checkUserReminders(userId: string): Promise<{ sentCount: number; notifications: ReminderNotification[] }> {
    const minutesBefore = await this.users.getReminderSettings(userId);
    if (minutesBefore === null) {
      return { sentCount: 0, notifications: [] };
    }

    const user = await this.users.findById(userId);
    const recipientEmail = user?.email || 'user@bookpal.demo';

    const currentTime = this.now();
    const nowIstanbul = istanbulParts(currentTime);
    const todayStr = nowIstanbul.date;
    const nowMinutes = istanbulMinutes(nowIstanbul.date, nowIstanbul.time);

    // Bugünden yarına kadar olan randevuları kontrol et
    const tomorrowStr = istanbulParts(new Date(currentTime.getTime() + 24 * 60 * 60 * 1000)).date;

    const upcomingAppointments = await this.appointments.listByDateRange(userId, todayStr, tomorrowStr);
    const createdNotifications: ReminderNotification[] = [];

    for (const app of upcomingAppointments) {
      if (app.status !== 'scheduled' || app.reminderSentAt) {
        continue;
      }

      const diffMinutes = istanbulMinutes(app.date, app.startTime) - nowMinutes;

      // Randevu zamanı henüz geçmemiş ve belirlenen pencere içinde mi?
      if (diffMinutes >= 0 && diffMinutes <= minutesBefore) {
        // Önce üstlen: aynı anda çalışan başka bir kontrol (zamanlayıcı ya da elle) aynı e-postayı göndermesin.
        const nowIso = currentTime.toISOString();
        if (!(await this.appointments.claimReminder(userId, app.id, nowIso))) continue;
        try {
          const client = await this.clients.findById(userId, app.clientId);
          const clientName = client ? `${client.firstName} ${client.lastName}` : 'Danışan';

          // Geçmiş seansları al
          const clientAppointments = await this.appointments.listByClient(userId, app.clientId);
          const pastAppointments = clientAppointments
            .filter((p) => p.id !== app.id)
            .map((p) => ({ date: p.date, status: p.status, note: p.note }));

          const aiSummary = await this.ai.summarizeClientHistory({
            clientName,
            upcomingAppointment: { date: app.date, startTime: app.startTime, note: app.note },
            pastAppointments,
          });

          const subject = `Randevu Hatırlatması: ${clientName} ile seansınız yaklaşıyor (${app.startTime})`;
          const body = `Merhaba,

${app.date} tarihinde saat ${app.startTime}–${app.endTime} aralığında ${clientName} ile randevunuz bulunmaktadır.

--- Seans Öncesi Hazırlık Özeti ---
${aiSummary}

İyi çalışmalar dileriz.
Bookpal`;

          await this.emailSender.send({ to: recipientEmail, subject, body });

          const notification: ReminderNotification = {
            id: randomUUID(),
            userId,
            appointmentId: app.id,
            recipientEmail,
            subject,
            body,
            sentAt: nowIso,
          };

          await this.notifications.create(notification);
          createdNotifications.push(notification);
        } catch (error) {
          // Gönderilemediyse üstlenmeyi bırak: sonraki kontrol yeniden denesin.
          await this.appointments.markReminderSent(userId, app.id, null);
          throw error;
        }
      }
    }

    return { sentCount: createdNotifications.length, notifications: createdNotifications };
  }

  async checkAllUsers(): Promise<number> {
    const users = await this.users.listUsersWithRemindersEnabled();
    let totalSent = 0;
    for (const u of users) {
      try {
        const result = await this.checkUserReminders(u.id);
        totalSent += result.sentCount;
      } catch (error) {
        // Bir kullanıcının hatası diğerlerinin hatırlatmasını durdurmasın.
        console.error(`Hatırlatma kontrolü başarısız (kullanıcı ${u.id}):`, error instanceof Error ? error.message : error);
      }
    }
    return totalSent;
  }
}
