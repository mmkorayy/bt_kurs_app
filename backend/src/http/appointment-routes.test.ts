import test from 'node:test';
import assert from 'node:assert/strict';
import { ELIF, MERT, startTestServer } from '../test-support.js';

const elif = { firstName: 'Elif', lastName: 'Yıldız', birthDate: '1990-05-17', gender: 'female' };

type Api = (path: string, init?: { method?: string; body?: unknown }) => Promise<Response>;
type AppointmentBody = { appointment: { id: string; status: string; client: { firstName: string } } };
type ListBody = { appointments: Array<{ id: string }> };

async function newClient(api: Api): Promise<string> {
  const res = await api('/clients', { method: 'POST', body: elif });
  return ((await res.json()) as { client: { id: string } }).client.id;
}

const slot = (clientId: string, over: Record<string, unknown> = {}) => ({
  clientId,
  date: '2026-11-02',
  startTime: '10:00',
  endTime: '11:00',
  ...over,
});

test('an unauthenticated list is 401', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/appointments?from=2026-11-01&to=2026-11-30`);
  assert.equal(res.status, 401);
});

test('create answers 201 with the client name inside', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const clientId = await newClient(api);
  const res = await api('/appointments', { method: 'POST', body: slot(clientId) });
  assert.equal(res.status, 201);
  const { appointment } = (await res.json()) as AppointmentBody;
  assert.equal(appointment.client.firstName, 'Elif');
  assert.equal(appointment.status, 'scheduled');
});

test('creating with another user client id is 404', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const owner = await server.login(ELIF);
  const other = await server.login(MERT);
  const clientId = await newClient(owner.api);
  const res = await other.api('/appointments', { method: 'POST', body: slot(clientId) });
  assert.equal(res.status, 404);
  assert.equal(((await res.json()) as { error: { message: string } }).error.message, 'Danışan bulunamadı.');
});

test('an overlapping create is 409 conflict and a touching one is 201', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const clientId = await newClient(api);
  await api('/appointments', { method: 'POST', body: slot(clientId) });
  const overlap = await api('/appointments', { method: 'POST', body: slot(clientId, { startTime: '10:30', endTime: '11:30' }) });
  assert.equal(overlap.status, 409);
  assert.equal(((await overlap.json()) as { error: { code: string } }).error.code, 'conflict');
  const touching = await api('/appointments', { method: 'POST', body: slot(clientId, { startTime: '11:00', endTime: '12:00' }) });
  assert.equal(touching.status, 201);
});

test('the list needs both dates and at most 366 days', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  assert.equal((await api('/appointments?to=2026-11-30')).status, 400);
  assert.equal((await api('/appointments?from=2026-01-01&to=2027-01-02')).status, 400);
  assert.equal((await api('/appointments?from=2026-01-01&to=2027-01-01')).status, 200);
});

test('the list only shows the user own appointments in the range', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const owner = await server.login(ELIF);
  const other = await server.login(MERT);
  const clientId = await newClient(owner.api);
  await owner.api('/appointments', { method: 'POST', body: slot(clientId) });
  await owner.api('/appointments', { method: 'POST', body: slot(clientId, { date: '2026-12-01' }) });
  const mine = (await (await owner.api('/appointments?from=2026-11-01&to=2026-11-30')).json()) as ListBody;
  assert.equal(mine.appointments.length, 1);
  const theirs = (await (await other.api('/appointments?from=2026-11-01&to=2026-11-30')).json()) as ListBody;
  assert.deepEqual(theirs.appointments, []);
});

test('cancelling by patch frees the slot for a new appointment', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const clientId = await newClient(api);
  const created = await api('/appointments', { method: 'POST', body: slot(clientId) });
  const { appointment } = (await created.json()) as AppointmentBody;
  const patched = await api(`/appointments/${appointment.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
  assert.equal(patched.status, 200);
  const again = await api('/appointments', { method: 'POST', body: slot(clientId) });
  assert.equal(again.status, 201);
});

test('delete is 204 and the appointment is then 404', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const clientId = await newClient(api);
  const { appointment } = (await (await api('/appointments', { method: 'POST', body: slot(clientId) })).json()) as AppointmentBody;
  assert.equal((await api(`/appointments/${appointment.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await api(`/appointments/${appointment.id}`)).status, 404);
});
