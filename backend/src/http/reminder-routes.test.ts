import test from 'node:test';
import assert from 'node:assert/strict';
import { ELIF, MERT, buildTestDeps, startTestServer } from '../test-support.js';

// Sabit saat: 2 Kasım 2026, 09:45 İstanbul saati (06:45 UTC)
const NOW = () => new Date('2026-11-02T06:45:00Z');

type Notifications = { notifications: Array<{ appointmentId: string; body: string }> };

async function appointmentAt(api: (p: string, i?: { method?: string; body?: unknown }) => Promise<Response>, start: string, end: string) {
  const c = await api('/clients', {
    method: 'POST',
    body: { firstName: 'Elif', lastName: 'Yıldız', birthDate: '1990-05-17', gender: 'female' },
  });
  const clientId = ((await c.json()) as { client: { id: string } }).client.id;
  const a = await api('/appointments', {
    method: 'POST',
    body: { clientId, date: '2026-11-02', startTime: start, endTime: end, status: 'scheduled', note: '' },
  });
  return ((await a.json()) as { appointment: { id: string } }).appointment.id;
}

test('reminder settings default to 30 and can be changed or turned off', async (t) => {
  const server = startTestServer(buildTestDeps({}, NOW));
  t.after(() => server.close());
  const { api } = await server.login(ELIF);

  assert.deepEqual(await (await api('/settings/reminders')).json(), { reminderMinutesBefore: 30 });
  for (const value of [15, 60, null]) {
    const res = await api('/settings/reminders', { method: 'PATCH', body: { reminderMinutesBefore: value } });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { reminderMinutesBefore: value });
  }
});

test('invalid reminder minutes are a validation error', async (t) => {
  const server = startTestServer(buildTestDeps({}, NOW));
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  for (const value of [45, 'abc']) {
    const res = await api('/settings/reminders', { method: 'PATCH', body: { reminderMinutesBefore: value } });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'validation_error');
  }
});

test('reminder routes need a session', async (t) => {
  const server = startTestServer(buildTestDeps({}, NOW));
  t.after(() => server.close());
  for (const [method, path] of [['GET', '/settings/reminders'], ['POST', '/reminders/check'], ['GET', '/reminders/sent']]) {
    const res = await fetch(`${server.baseUrl}/api/v1${path}`, { method });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('check sends one reminder for an upcoming appointment, only once, and lists it', async (t) => {
  const server = startTestServer(buildTestDeps({}, NOW));
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const id = await appointmentAt(api, '10:00', '11:00');

  const first = await api('/reminders/check', { method: 'POST' });
  assert.equal(first.status, 200);
  const firstBody = (await first.json()) as { sentCount: number } & Notifications;
  assert.equal(firstBody.sentCount, 1);
  assert.equal(firstBody.notifications[0].appointmentId, id);

  const second = (await (await api('/reminders/check', { method: 'POST' })).json()) as { sentCount: number };
  assert.equal(second.sentCount, 0);

  const sent = (await (await api('/reminders/sent')).json()) as Notifications;
  assert.equal(sent.notifications.length, 1);
});

test('an appointment outside the window gets no reminder', async (t) => {
  const server = startTestServer(buildTestDeps({}, NOW));
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  await appointmentAt(api, '15:00', '16:00');
  const res = (await (await api('/reminders/check', { method: 'POST' })).json()) as { sentCount: number };
  assert.equal(res.sentCount, 0);
});

test('one user never sees another user notifications', async (t) => {
  const server = startTestServer(buildTestDeps({}, NOW));
  t.after(() => server.close());
  const elif = await server.login(ELIF);
  const mert = await server.login(MERT);
  await appointmentAt(elif.api, '10:00', '11:00');
  await elif.api('/reminders/check', { method: 'POST' });

  const sent = (await (await mert.api('/reminders/sent')).json()) as Notifications;
  assert.equal(sent.notifications.length, 0);
});

test('a strange limit on the sent list is treated like the default, never an error', async (t) => {
  const server = startTestServer(buildTestDeps({}, NOW));
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  await appointmentAt(api, '10:00', '11:00');
  await api('/reminders/check', { method: 'POST' });
  for (const limit of ['-1', '1.5', 'abc', '0', '100000']) {
    const res = await api(`/reminders/sent?limit=${limit}`);
    assert.equal(res.status, 200, `limit=${limit}`);
    assert.equal(((await res.json()) as Notifications).notifications.length, 1, `limit=${limit}`);
  }
});
