import test from 'node:test';
import assert from 'node:assert/strict';
import { FallbackAiAssistant } from '../ai/fallback-ai-assistant.js';
import type { Appointment, Client, User } from '../domain/types.js';
import { MemoryAppointmentRepository } from '../repositories/memory/appointment-repository.js';
import { MemoryClientRepository } from '../repositories/memory/client-repository.js';
import { MemoryReminderNotificationRepository } from '../repositories/memory/reminder-notification-repository.js';
import { MemoryUserRepository } from '../repositories/memory/user-repository.js';
import type { EmailMessage, EmailSender } from './email-sender.js';
import { ReminderService } from './reminder-service.js';

class MockEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

function setup() {
  const user: User = { id: 'u1', email: 'uzman@bookpal.demo', displayName: 'Dr. Uzman' };
  const users = new MemoryUserRepository([user]);
  const appointments = new MemoryAppointmentRepository();
  const clients = new MemoryClientRepository();
  const notifications = new MemoryReminderNotificationRepository();
  const ai = new FallbackAiAssistant();
  const emailSender = new MockEmailSender();

  // Sabit referans zamanı: 2026-11-17 saat 13:35
  const mockNow = new Date(2026, 10, 17, 13, 35, 0);

  const service = new ReminderService(
    users,
    appointments,
    clients,
    notifications,
    ai,
    emailSender,
    () => mockNow,
  );

  return { service, users, appointments, clients, notifications, emailSender, mockNow };
}

test('creates notification for upcoming appointment within reminder window', async () => {
  const { service, appointments, clients, emailSender, notifications } = setup();

  const client: Client = {
    id: 'c1',
    userId: 'u1',
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    birthDate: '1990-01-01',
    gender: 'female',
    deletedAt: null,
  };
  await clients.create(client);

  // Randevu 14:00'te (şu an 13:35, yani 25 dk sonra, 30 dk penceresi içinde)
  const app: Appointment = {
    id: 'a1',
    userId: 'u1',
    clientId: 'c1',
    date: '2026-11-17',
    startTime: '14:00',
    endTime: '15:00',
    status: 'scheduled',
    note: 'Kontrol seansı',
  };
  await appointments.saveIfNoConflict(app);

  const result = await service.checkUserReminders('u1');
  assert.equal(result.sentCount, 1);
  assert.equal(emailSender.sent.length, 1);
  assert.equal(emailSender.sent[0].to, 'uzman@bookpal.demo');
  assert.match(emailSender.sent[0].subject, /Ayşe Yılmaz/);
  assert.match(emailSender.sent[0].subject, /14:00/);

  const stored = await notifications.listByUser('u1');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].appointmentId, 'a1');

  // İkinci kez çağrıldığında tekrar göndermez
  const secondResult = await service.checkUserReminders('u1');
  assert.equal(secondResult.sentCount, 0);
  assert.equal(emailSender.sent.length, 1);
});

test('does not send reminder when reminders are disabled (null)', async () => {
  const { service, appointments, clients, users, emailSender } = setup();
  await users.updateReminderSettings('u1', null);

  const client: Client = {
    id: 'c1',
    userId: 'u1',
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    birthDate: '1990-01-01',
    gender: 'female',
    deletedAt: null,
  };
  await clients.create(client);

  const app: Appointment = {
    id: 'a1',
    userId: 'u1',
    clientId: 'c1',
    date: '2026-11-17',
    startTime: '14:00',
    endTime: '15:00',
    status: 'scheduled',
    note: 'Kontrol',
  };
  await appointments.saveIfNoConflict(app);

  const result = await service.checkUserReminders('u1');
  assert.equal(result.sentCount, 0);
  assert.equal(emailSender.sent.length, 0);
});

test('does not send reminder for cancelled appointments', async () => {
  const { service, appointments, clients, emailSender } = setup();

  const client: Client = {
    id: 'c1',
    userId: 'u1',
    firstName: 'Ayşe',
    lastName: 'Yılmaz',
    birthDate: '1990-01-01',
    gender: 'female',
    deletedAt: null,
  };
  await clients.create(client);

  const app: Appointment = {
    id: 'a1',
    userId: 'u1',
    clientId: 'c1',
    date: '2026-11-17',
    startTime: '14:00',
    endTime: '15:00',
    status: 'cancelled',
    note: 'İptal edildi',
  };
  await appointments.saveIfNoConflict(app);

  const result = await service.checkUserReminders('u1');
  assert.equal(result.sentCount, 0);
  assert.equal(emailSender.sent.length, 0);
});
