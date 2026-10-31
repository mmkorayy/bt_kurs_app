import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../domain/errors.js';
import { MemorySessionStore } from '../repositories/memory/session-store.js';
import { DemoIdentityProvider } from './demo-identity-provider.js';
import { SessionService } from './session-service.js';

const elif = { email: 'elif@bookpal.demo', password: 'demo-elif-123' };
const isUnauthorized = (e: unknown) => e instanceof AppError && e.status === 401 && e.code === 'unauthorized';

function setup() {
  return new SessionService(new DemoIdentityProvider(), new MemorySessionStore());
}

test('login gives a token that authenticates the same user', async () => {
  const sessions = setup();
  const { token, user } = await sessions.login(elif);
  assert.equal(user.id, 'demo-user-elif');
  assert.equal((await sessions.authenticateToken(token)).id, 'demo-user-elif');
});

test('a wrong password is unauthorized', async () => {
  const sessions = setup();
  await assert.rejects(() => sessions.login({ ...elif, password: 'wrong' }), isUnauthorized);
});

test('a missing or unknown token is unauthorized', async () => {
  const sessions = setup();
  await assert.rejects(() => sessions.authenticateToken(undefined), isUnauthorized);
  await assert.rejects(() => sessions.authenticateToken('0'.repeat(64)), isUnauthorized);
});

test('after logout the token is unauthorized', async () => {
  const sessions = setup();
  const { token } = await sessions.login(elif);
  await sessions.logout(token);
  await assert.rejects(() => sessions.authenticateToken(token), isUnauthorized);
});
