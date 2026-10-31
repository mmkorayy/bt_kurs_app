import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './config.js';

test('defaults: port 3000, not production, demo accounts on', () => {
  assert.deepEqual(loadConfig({}), { port: 3000, production: false, demoAccountsEnabled: true });
});

test('PORT overrides the port and an invalid PORT falls back to 3000', () => {
  assert.equal(loadConfig({ PORT: '4000' }).port, 4000);
  assert.equal(loadConfig({ PORT: 'abc' }).port, 3000);
});

test('production turns demo accounts off by default', () => {
  const config = loadConfig({ NODE_ENV: 'production' });
  assert.equal(config.production, true);
  assert.equal(config.demoAccountsEnabled, false);
});

test('DEMO_ACCOUNTS_ENABLED overrides the default in both directions', () => {
  assert.equal(loadConfig({ NODE_ENV: 'production', DEMO_ACCOUNTS_ENABLED: 'true' }).demoAccountsEnabled, true);
  assert.equal(loadConfig({ DEMO_ACCOUNTS_ENABLED: 'false' }).demoAccountsEnabled, false);
});
