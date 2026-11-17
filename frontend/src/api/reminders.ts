import { request } from './client';
import type { ReminderMinutes, ReminderNotification, ReminderSettings } from './types';

export function getReminderSettings(): Promise<ReminderSettings> {
  return request<ReminderSettings>('/settings/reminders');
}

export function updateReminderSettings(reminderMinutesBefore: ReminderMinutes | null): Promise<ReminderSettings> {
  return request<ReminderSettings>('/settings/reminders', { method: 'PATCH', body: { reminderMinutesBefore } });
}

/** Hatırlatma penceresindeki randevuları şimdi tarar. */
export function checkRemindersNow(): Promise<{ sentCount: number; notifications: ReminderNotification[] }> {
  return request('/reminders/check', { method: 'POST' });
}

export async function listSentReminders(): Promise<ReminderNotification[]> {
  const result = await request<{ notifications: ReminderNotification[] }>('/reminders/sent');
  return result.notifications;
}
