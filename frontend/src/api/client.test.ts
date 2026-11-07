import { stubFetch } from '../test-utils';
import { ApiError, request, setUnauthorizedHandler } from './client';

afterEach(() => setUnauthorizedHandler(undefined));

test('a 204 answer gives undefined', async () => {
  stubFetch({ 'POST /api/v1/auth/logout': () => ({ status: 204 }) });
  expect(await request('/auth/logout', { method: 'POST' })).toBeUndefined();
});

test('a 200 answer gives the parsed JSON', async () => {
  stubFetch({ 'GET /api/v1/health': () => ({ body: { status: 'ok' } }) });
  expect(await request('/health')).toEqual({ status: 'ok' });
});

test('a request body is sent as JSON', async () => {
  const { calls } = stubFetch({ 'POST /api/v1/clients': () => ({ status: 201, body: {} }) });
  await request('/clients', { method: 'POST', body: { firstName: 'Elif' } });
  expect(calls[0].body).toEqual({ firstName: 'Elif' });
});

test('an error answer throws ApiError with the Turkish message from the server', async () => {
  stubFetch({
    'POST /api/v1/clients': () => ({
      status: 400,
      body: { error: { code: 'validation_error', message: 'Doğum tarihi gelecekte olamaz.' } },
    }),
  });
  const failure = await request('/clients', { method: 'POST', body: {} }).catch((e: unknown) => e);
  expect(failure).toBeInstanceOf(ApiError);
  expect(failure).toMatchObject({ status: 400, code: 'validation_error', message: 'Doğum tarihi gelecekte olamaz.' });
});

test('an unreachable server gives status 0 and "Sunucuya ulaşılamadı."', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  const failure = await request('/clients').catch((e: unknown) => e);
  expect(failure).toMatchObject({ status: 0, message: 'Sunucuya ulaşılamadı.' });
});

test('a 401 calls the unauthorized handler, unless the call opts out', async () => {
  stubFetch({
    'GET /api/v1/clients': () => ({ status: 401, body: { error: { code: 'unauthorized', message: 'Giriş gerekli.' } } }),
  });
  const handler = vi.fn();
  setUnauthorizedHandler(handler);
  await request('/clients').catch(() => undefined);
  expect(handler).toHaveBeenCalledTimes(1);
  await request('/clients', { skipUnauthorized: true }).catch(() => undefined);
  expect(handler).toHaveBeenCalledTimes(1);
});
