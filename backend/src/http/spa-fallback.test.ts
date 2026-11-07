import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildTestDeps, startTestServer } from '../test-support.js';

function makeStaticDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookpal-static-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><p>Bookpal App</p>');
  return dir;
}

test('a browser-side route such as /panel/hafta returns index.html', async (t) => {
  const server = startTestServer(buildTestDeps({ staticDir: makeStaticDir() }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/panel/hafta`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Bookpal App/);
});

test('a missing file with an extension stays 404', async (t) => {
  const server = startTestServer(buildTestDeps({ staticDir: makeStaticDir() }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/assets/missing.js`);
  assert.equal(res.status, 404);
});

test('an unknown /api path stays a JSON 404', async (t) => {
  const server = startTestServer(buildTestDeps({ staticDir: makeStaticDir() }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/api/v1/nope`);
  assert.equal(res.status, 404);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'not_found');
});

test('without a built index.html a browser route is a plain 404, not a server error', async (t) => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookpal-empty-'));
  const server = startTestServer(buildTestDeps({ staticDir: emptyDir }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/panel`);
  assert.equal(res.status, 404);
});

test('/docs is not swallowed by the fallback', async (t) => {
  const server = startTestServer(buildTestDeps({ staticDir: makeStaticDir() }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/docs`);
  assert.equal(res.status, 404);
  assert.doesNotMatch(await res.text(), /Bookpal App/);
});
