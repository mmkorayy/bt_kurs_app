import test from 'node:test';
import assert from 'node:assert/strict';
import { ELIF, MERT, startTestServer } from '../test-support.js';

const elif = { firstName: 'Elif', lastName: 'Yıldız', birthDate: '1990-05-17', gender: 'female' };

type ClientBody = { client: { id: string; firstName: string; lastName: string } };
type ListBody = { clients: Array<{ id: string; firstName: string }> };

test('an unauthenticated list is 401', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/clients`);
  assert.equal(res.status, 401);
});

test('create answers 201 with the new client', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const res = await api('/clients', { method: 'POST', body: elif });
  assert.equal(res.status, 201);
  const { client } = (await res.json()) as ClientBody;
  assert.equal(client.firstName, 'Elif');
  assert.equal(typeof client.id, 'string');
});

test('list with search finds İlker for "ilker"', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  await api('/clients', { method: 'POST', body: { ...elif, firstName: 'İlker', lastName: 'Demir' } });
  await api('/clients', { method: 'POST', body: elif });
  const res = await api('/clients?search=ilker');
  const { clients } = (await res.json()) as ListBody;
  assert.deepEqual(clients.map((c) => c.firstName), ['İlker']);
});

test('invalid bodies are 400', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const blank = await api('/clients', { method: 'POST', body: { ...elif, firstName: '  ' } });
  assert.equal(blank.status, 400);
  const future = await api('/clients', { method: 'POST', body: { ...elif, birthDate: '2999-01-01' } });
  assert.equal(future.status, 400);
});

test('another user client is 404 for get, patch and delete', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const owner = await server.login(ELIF);
  const other = await server.login(MERT);
  const { client } = (await (await owner.api('/clients', { method: 'POST', body: elif })).json()) as ClientBody;
  assert.equal((await other.api(`/clients/${client.id}`)).status, 404);
  assert.equal((await other.api(`/clients/${client.id}`, { method: 'PATCH', body: { lastName: 'X' } })).status, 404);
  assert.equal((await other.api(`/clients/${client.id}`, { method: 'DELETE' })).status, 404);
  assert.deepEqual(((await (await other.api('/clients')).json()) as ListBody).clients, []);
});

test('patch changes a field and an empty patch is 400', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const { client } = (await (await api('/clients', { method: 'POST', body: elif })).json()) as ClientBody;
  const patched = await api(`/clients/${client.id}`, { method: 'PATCH', body: { lastName: 'Kaya' } });
  assert.equal(patched.status, 200);
  assert.equal(((await patched.json()) as ClientBody).client.lastName, 'Kaya');
  assert.equal((await api(`/clients/${client.id}`, { method: 'PATCH', body: {} })).status, 400);
});

test('delete is 204 and the client is gone from list and get', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { api } = await server.login(ELIF);
  const { client } = (await (await api('/clients', { method: 'POST', body: elif })).json()) as ClientBody;
  assert.equal((await api(`/clients/${client.id}`, { method: 'DELETE' })).status, 204);
  assert.deepEqual(((await (await api('/clients')).json()) as ListBody).clients, []);
  assert.equal((await api(`/clients/${client.id}`)).status, 404);
});
