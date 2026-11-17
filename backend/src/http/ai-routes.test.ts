import test from 'node:test';
import assert from 'node:assert/strict';
import { ELIF, MERT, buildTestDeps, startTestServer } from '../test-support.js';

type Draft = {
  clientId: string | null;
  suggestedClient: { firstName: string; lastName: string } | null;
  date: string;
  startTime: string;
  endTime: string;
};

const person = (firstName: string, lastName: string) => ({
  firstName,
  lastName,
  birthDate: '1990-05-17',
  gender: 'female',
});

test('parse-appointment without a session is 401', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/ai/parse-appointment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'Yarın 14:00' }),
  });
  assert.equal(res.status, 401);
});

test('an empty prompt is a validation error', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const res = await api('/ai/parse-appointment', { method: 'POST', body: { prompt: '   ' } });
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'validation_error');
});

test('a sentence about a saved client returns a draft with that client', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const created = await api('/clients', { method: 'POST', body: person('Elif', 'Yıldız') });
  const clientId = ((await created.json()) as { client: { id: string } }).client.id;

  const res = await api('/ai/parse-appointment', {
    method: 'POST',
    body: { prompt: 'Yarın 14:00 Elif Yıldız kontrol randevusu', referenceDate: '2026-11-02' },
  });
  assert.equal(res.status, 200);
  const { draft } = (await res.json()) as { draft: Draft };
  assert.equal(draft.clientId, clientId);
  assert.equal(draft.date, '2026-11-03');
  assert.equal(draft.startTime, '14:00');
});

test('another user client is never matched, and nothing is saved', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const elif = await server.login(ELIF);
  const mert = await server.login(MERT);
  await mert.api('/clients', { method: 'POST', body: person('Ali', 'Veli') });

  const res = await elif.api('/ai/parse-appointment', {
    method: 'POST',
    body: { prompt: 'Yarın 14:00 Ali Veli', referenceDate: '2026-11-02' },
  });
  assert.equal(res.status, 200);
  const { draft } = (await res.json()) as { draft: Draft };
  assert.equal(draft.clientId, null);
  assert.deepEqual(draft.suggestedClient, { firstName: 'Ali', lastName: 'Veli' });

  const clients = (await (await elif.api('/clients')).json()) as { clients: unknown[] };
  assert.equal(clients.clients.length, 0);
  const appts = (await (await elif.api('/appointments?from=2026-11-01&to=2026-11-30')).json()) as {
    appointments: unknown[];
  };
  assert.equal(appts.appointments.length, 0);
});

test('a draft naming a client that is not the user own is cleaned before it is returned', async (t) => {
  const evil = {
    async parseAppointmentPrompt() {
      return { clientId: 'not-mine', suggestedClient: null, date: '2026-02-31', startTime: '25:00', endTime: '26:00', note: 'x' };
    },
    async summarizeClientHistory() {
      return '';
    },
  };
  const server = startTestServer(buildTestDeps({ ai: evil }));
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const res = await api('/ai/parse-appointment', { method: 'POST', body: { prompt: 'x', referenceDate: '2026-11-02' } });
  const { draft } = (await res.json()) as { draft: Draft };
  assert.equal(draft.clientId, null);
  assert.equal(draft.date, '2026-11-02');
  assert.equal(draft.startTime, '');
});
