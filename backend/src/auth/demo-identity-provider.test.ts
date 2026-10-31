import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoIdentityProvider } from './demo-identity-provider.js';

test('both demo accounts can authenticate', async () => {
  const provider = new DemoIdentityProvider();
  const elif = await provider.authenticate({ email: 'elif@bookpal.demo', password: 'demo-elif-123' });
  const mert = await provider.authenticate({ email: 'mert@bookpal.demo', password: 'demo-mert-123' });
  assert.equal(elif?.id, 'demo-user-elif');
  assert.equal(mert?.id, 'demo-user-mert');
});

test('the email is trimmed and compared in lowercase', async () => {
  const provider = new DemoIdentityProvider();
  const user = await provider.authenticate({ email: ' ELIF@bookpal.demo ', password: 'demo-elif-123' });
  assert.equal(user?.email, 'elif@bookpal.demo');
});

test('a wrong password and an unknown email are rejected', async () => {
  const provider = new DemoIdentityProvider();
  assert.equal(await provider.authenticate({ email: 'elif@bookpal.demo', password: 'wrong' }), undefined);
  assert.equal(await provider.authenticate({ email: 'elif@bookpal.demo', password: 'demo-mert-123' }), undefined);
  assert.equal(await provider.authenticate({ email: 'nobody@bookpal.demo', password: 'demo-elif-123' }), undefined);
});

test('findUser returns a demo user by id and undefined for an unknown id', async () => {
  const provider = new DemoIdentityProvider();
  assert.equal((await provider.findUser('demo-user-mert'))?.displayName, 'Mert Kaya');
  assert.equal(await provider.findUser('nope'), undefined);
});
