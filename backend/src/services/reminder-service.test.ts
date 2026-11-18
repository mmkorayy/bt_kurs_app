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

  // Sabit referans zamanı: 2026-11-17 saat 13:35 (İstanbul, UTC+3)
  const mockNow = new Date('2026-11-17T10:35:00Z'); // 13:35 İstanbul saati

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


test('two checks at the same moment send only one reminder for an appointment', async () => {
  const { service, appointments, clients, emailSender, notifications } = setup();
  await clients.create({ id: 'c1', userId: 'u1', firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-01-01', gender: 'female', deletedAt: null });
  await appointments.saveIfNoConflict({
    id: 'a1', userId: 'u1', clientId: 'c1', date: '2026-11-17', startTime: '14:00', endTime: '15:00',
    status: 'scheduled', note: '', reminderSentAt: null,
  });

  const [a, b] = await Promise.all([service.checkUserReminders('u1'), service.checkUserReminders('u1')]);

  assert.equal(a.sentCount + b.sentCount, 1);
  assert.equal(emailSender.sent.length, 1);
  assert.equal((await notifications.listByUser('u1', 10)).length, 1);
});

test('the window uses Istanbul time, whatever the server time zone is', async () => {
  const { service, appointments, clients, emailSender } = setup();
  await clients.create({ id: 'c1', userId: 'u1', firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-01-01', gender: 'female', deletedAt: null });
  // Şimdi İstanbul'da 13:35. 14:00 randevusu 25 dk sonra: gönderilmeli. 17:00 randevusu: gönderilmemeli.
  for (const [id, start, end] of [['a1', '14:00', '15:00'], ['a2', '17:00', '18:00']]) {
    await appointments.saveIfNoConflict({
      id, userId: 'u1', clientId: 'c1', date: '2026-11-17', startTime: start, endTime: end,
      status: 'scheduled', note: '', reminderSentAt: null,
    });
  }
  const result = await service.checkUserReminders('u1');
  assert.equal(result.sentCount, 1);
  assert.equal(result.notifications[0].appointmentId, 'a1');
  assert.equal(emailSender.sent.length, 1);
});

test('a failed e-mail releases the claim so the next check can try again', async () => {
  const { service, appointments, clients, emailSender } = setup();
  await clients.create({ id: 'c1', userId: 'u1', firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-01-01', gender: 'female', deletedAt: null });
  await appointments.saveIfNoConflict({
    id: 'a1', userId: 'u1', clientId: 'c1', date: '2026-11-17', startTime: '14:00', endTime: '15:00',
    status: 'scheduled', note: '', reminderSentAt: null,
  });
  const original = emailSender.send.bind(emailSender);
  emailSender.send = async () => {
    throw new Error('smtp down');
  };
  await assert.rejects(() => service.checkUserReminders('u1'), /smtp down/);
  emailSender.send = original;
  assert.equal((await service.checkUserReminders('u1')).sentCount, 1);
});

test('checkAllUsers keeps going when one user fails', async () => {
  const { appointments, clients, notifications } = setup();
  const users = new MemoryUserRepository([
    { id: 'u1', email: 'bir@bookpal.demo', displayName: 'Bir' },
    { id: 'u2', email: 'iki@bookpal.demo', displayName: 'İki' },
  ]);
  const sent: string[] = [];
  const emailSender: EmailSender = {
    async send(message) {
      if (message.to === 'bir@bookpal.demo') throw new Error('smtp down');
      sent.push(message.to);
    },
  };
  const service = new ReminderService(users, appointments, clients, notifications, new FallbackAiAssistant(), emailSender, () => new Date('2026-11-17T10:35:00Z'));
  for (const id of ['u1', 'u2']) {
    await clients.create({ id: `c-${id}`, userId: id, firstName: 'Ayşe', lastName: 'Yılmaz', birthDate: '1990-01-01', gender: 'female', deletedAt: null });
    await appointments.saveIfNoConflict({
      id: `a-${id}`, userId: id, clientId: `c-${id}`, date: '2026-11-17', startTime: '14:00', endTime: '15:00',
      status: 'scheduled', note: '', reminderSentAt: null,
    });
  }
  assert.equal(await service.checkAllUsers(), 1);
  assert.deepEqual(sent, ['iki@bookpal.demo']);
});
