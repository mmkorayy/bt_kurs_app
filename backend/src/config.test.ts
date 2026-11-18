import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './config.js';

test('defaults: port 3000, not production, demo accounts on, no database', () => {
  assert.deepEqual(loadConfig({}), {
    port: 3000,
    production: false,
    demoAccountsEnabled: true,
    databaseUrl: undefined,
    geminiApiKey: undefined,
    geminiModel: undefined,
  });
});

test('DATABASE_URL is trimmed and an empty or blank value means no database', () => {
  assert.equal(loadConfig({ DATABASE_URL: '  postgres://u:p@h/db  ' }).databaseUrl, 'postgres://u:p@h/db');
  assert.equal(loadConfig({ DATABASE_URL: '' }).databaseUrl, undefined);
  assert.equal(loadConfig({ DATABASE_URL: '   ' }).databaseUrl, undefined);
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

test('GEMINI_API_KEY and GEMINI_MODEL are read when set, trimmed, and empty counts as unset', () => {
  assert.equal(loadConfig({ GEMINI_API_KEY: '  abc-key  ' }).geminiApiKey, 'abc-key');
  assert.equal(loadConfig({ GEMINI_API_KEY: '' }).geminiApiKey, undefined);
  assert.equal(loadConfig({ GEMINI_API_KEY: '   ' }).geminiApiKey, undefined);
  assert.equal(loadConfig({ GEMINI_MODEL: '  gemini-2.5-flash  ' }).geminiModel, 'gemini-2.5-flash');
  assert.equal(loadConfig({ GEMINI_MODEL: '' }).geminiModel, undefined);
});
