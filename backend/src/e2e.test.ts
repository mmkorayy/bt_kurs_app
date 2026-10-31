import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildDeps } from './deps.js';
import { buildTestDeps, ELIF, MERT, startTestServer } from './test-support.js';

const clientBody = { firstName: 'Elif', lastName: 'Yıldız', birthDate: '1990-05-17', gender: 'female' };

test('login, client, appointment, overlap, and another user sees nothing', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const elif = await server.login(ELIF);
  const mert = await server.login(MERT);

  const created = await elif.api('/clients', { method: 'POST', body: clientBody });
  assert.equal(created.status, 201);
  const clientId = ((await created.json()) as { client: { id: string } }).client.id;

  const slot = { clientId, date: '2026-11-02', startTime: '10:00', endTime: '11:00' };
  assert.equal((await elif.api('/appointments', { method: 'POST', body: slot })).status, 201);
  assert.equal((await elif.api('/appointments', { method: 'POST', body: { ...slot, startTime: '10:30', endTime: '11:30' } })).status, 409);

  const mertClients = (await (await mert.api('/clients')).json()) as { clients: unknown[] };
  assert.deepEqual(mertClients.clients, []);
  assert.equal((await mert.api(`/clients/${clientId}`)).status, 404);
  const mertDay = (await (await mert.api('/appointments?from=2026-11-02&to=2026-11-02')).json()) as { appointments: unknown[] };
  assert.deepEqual(mertDay.appointments, []);
});

test('every protected route is 401 without a token and after logout', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const routes: Array<[string, string]> = [
    ['GET', '/clients'],
    ['POST', '/clients'],
    ['GET', '/clients/x'],
    ['PATCH', '/clients/x'],
    ['DELETE', '/clients/x'],
    ['GET', '/appointments?from=2026-11-01&to=2026-11-02'],
    ['POST', '/appointments'],
    ['GET', '/appointments/x'],
    ['PATCH', '/appointments/x'],
    ['DELETE', '/appointments/x'],
    ['GET', '/auth/me'],
    ['POST', '/auth/logout'],
  ];
  for (const [method, route] of routes) {
    const res = await fetch(`${server.baseUrl}/api/v1${route}`, { method });
    assert.equal(res.status, 401, `${method} ${route}`);
  }
  const { token, api } = await server.login(ELIF);
  await api('/auth/logout', { method: 'POST' });
  const after = await fetch(`${server.baseUrl}/api/v1/clients`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(after.status, 401);
});

test('the server also serves the web folder', async (t) => {
  const staticDir = path.resolve(import.meta.dirname, '../../web');
  const server = startTestServer(buildTestDeps({ staticDir }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Bookpal/);
});

test('with demo accounts off nobody can log in', async (t) => {
  const server = startTestServer(buildDeps({ DEMO_ACCOUNTS_ENABLED: 'false' }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ELIF),
  });
  assert.equal(res.status, 401);
});
