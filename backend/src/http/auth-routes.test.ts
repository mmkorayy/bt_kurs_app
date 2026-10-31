import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTestDeps, ELIF, startTestServer } from '../test-support.js';

const post = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('login answers with a token, the user and a session cookie', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, post(ELIF));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { token: string; user: { email: string } };
  assert.equal(typeof body.token, 'string');
  assert.equal(body.user.email, 'elif@bookpal.demo');
  const cookie = res.headers.get('set-cookie') ?? '';
  assert.match(cookie, /bookpal_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/);
});

test('the session cookie is Secure in production', async (t) => {
  const server = startTestServer(buildTestDeps({ production: true }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, post(ELIF));
  assert.match(res.headers.get('set-cookie') ?? '', /Secure/);
});

test('a wrong password is 401 unauthorized', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, post({ ...ELIF, password: 'wrong' }));
  assert.equal(res.status, 401);
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'unauthorized');
});

test('a login body without email and password is 400 validation_error', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, post({}));
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'validation_error');
});

test('a malformed JSON body is 400 validation_error, not 500', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{bad',
  });
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'validation_error');
});

test('me works with the Bearer token and with the cookie, and is 401 without either', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { token } = await server.login(ELIF);

  const bearer = await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(bearer.status, 200);
  assert.equal(((await bearer.json()) as { user: { email: string } }).user.email, 'elif@bookpal.demo');

  const cookie = await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers: { cookie: `bookpal_session=${token}` } });
  assert.equal(cookie.status, 200);

  const none = await fetch(`${server.baseUrl}/api/v1/auth/me`);
  assert.equal(none.status, 401);
  const unknown = await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers: { authorization: 'Bearer nope' } });
  assert.equal(unknown.status, 401);
});

test('logout is 204 and the same token is then 401', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { token, api } = await server.login(ELIF);
  const out = await api('/auth/logout', { method: 'POST' });
  assert.equal(out.status, 204);
  assert.match(out.headers.get('set-cookie') ?? '', /Max-Age=0/);
  const after = await fetch(`${server.baseUrl}/api/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(after.status, 401);
});

test('an unknown API path is a 404 not_found JSON error', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/nope`);
  assert.equal(res.status, 404);
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'not_found');
});
