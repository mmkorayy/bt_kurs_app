import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './config.js';
import { buildPostgresDeps } from './deps.js';
import { ELIF, MERT, startTestServer } from './test-support.js';
import { openTestDb, testDbEnabled } from './test-db.js';

const clientBody = { firstName: 'Elif', lastName: 'Yıldız', birthDate: '1990-05-17', gender: 'female' };

test('postgres: login, client, appointment, 409, and the data survives a new app instance', { skip: !testDbEnabled }, async (t) => {
  const db = await openTestDb({ max: 4 });
  t.after(() => db.close());
  const config = loadConfig({});

  const first = startTestServer(await buildPostgresDeps(db.pool, config));
  const elif = await first.login(ELIF);
  const created = await elif.api('/clients', { method: 'POST', body: clientBody });
  assert.equal(created.status, 201);
  const clientId = ((await created.json()) as { client: { id: string } }).client.id;
  const slot = { clientId, date: '2026-11-02', startTime: '10:00', endTime: '11:00' };
  assert.equal((await elif.api('/appointments', { method: 'POST', body: slot })).status, 201);
  assert.equal((await elif.api('/appointments', { method: 'POST', body: { ...slot, startTime: '10:30', endTime: '11:30' } })).status, 409);
  first.close();

  // Sunucunun yeniden başlamasını taklit eder: yeni uygulama örneği, aynı veritabanı.
  const second = startTestServer(await buildPostgresDeps(db.pool, config));
  t.after(() => second.close());
  const oldSession = await fetch(`${second.baseUrl}/api/v1/clients`, { headers: { authorization: `Bearer ${elif.token}` } });
  assert.equal(oldSession.status, 200, 'the old login token still works');
  const clients = ((await oldSession.json()) as { clients: Array<{ id: string }> }).clients;
  assert.deepEqual(clients.map((c) => c.id), [clientId]);
  const again = await second.login(ELIF);
  const day = (await (await again.api('/appointments?from=2026-11-02&to=2026-11-02')).json()) as {
    appointments: Array<{ startTime: string; date: string }>;
  };
  assert.deepEqual(day.appointments.map((a) => [a.date, a.startTime]), [['2026-11-02', '10:00']]);

  const mert = await second.login(MERT);
  assert.deepEqual(((await (await mert.api('/clients')).json()) as { clients: unknown[] }).clients, []);
});
