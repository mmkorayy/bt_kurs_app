import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { errorHandler } from './error-handler.js';
import { ELIF, startTestServer } from '../test-support.js';

type ErrorBody = { error: { code: string; message: string } };

test('a body over the size limit is 400 validation_error, not 500', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'a', password: 'x'.repeat(200_000) }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as ErrorBody;
  assert.equal(body.error.code, 'validation_error');
  assert.equal(body.error.message, 'İstek gövdesi çok büyük.');
});

test('an unsupported charset is 400 validation_error, not 500', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=latin1' },
    body: JSON.stringify(ELIF),
  });
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as ErrorBody).error.code, 'validation_error');
});

test('a badly percent-encoded id is 400 validation_error, not 500', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const { token } = await server.login(ELIF);
  const res = await fetch(`${server.baseUrl}/api/v1/clients/%ZZ`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 400);
  assert.equal(((await res.json()) as ErrorBody).error.code, 'validation_error');
});

test('an unexpected error stays a 500 with a generic message', (t) => {
  t.mock.method(console, 'error', () => {});
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: unknown) {
      sent.body = body;
      return this;
    },
  } as unknown as Response;
  errorHandler(new Error('boom: secret details'), {} as Request, res, () => {});
  assert.equal(sent.status, 500);
  assert.deepEqual(sent.body, { error: { code: 'server_error', message: 'Beklenmeyen bir hata oluştu.' } });
});
