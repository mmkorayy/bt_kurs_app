import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildTestDeps, startTestServer } from '../test-support.js';

const specPath = path.resolve(import.meta.dirname, '../../../api-contract/openapi.yaml');

test('GET /docs/openapi.yaml serves the contract file', async (t) => {
  const server = startTestServer(buildTestDeps({ docs: { specPath } }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/docs/openapi.yaml`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /^openapi: 3\.0\.3/);
});

test('GET /docs/ serves an HTML page that points at the contract', async (t) => {
  const server = startTestServer(buildTestDeps({ docs: { specPath } }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/docs/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const html = await res.text();
  assert.match(html, /\/docs\/openapi\.yaml/);
  assert.match(html, /Bookpal/);
});

test('GET /docs without a trailing slash also serves the page', async (t) => {
  const server = startTestServer(buildTestDeps({ docs: { specPath } }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/docs`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /\/docs\/openapi\.yaml/);
});

test('GET /docs/assets/swagger-ui-bundle.js serves the Swagger UI files', async (t) => {
  const server = startTestServer(buildTestDeps({ docs: { specPath } }));
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/docs/assets/swagger-ui-bundle.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /javascript/);
});

test('in production none of the docs addresses exist', async (t) => {
  const server = startTestServer(buildTestDeps({ production: true, docs: { specPath } }));
  t.after(() => server.close());
  for (const address of ['/docs/', '/docs/openapi.yaml', '/docs/assets/swagger-ui-bundle.js']) {
    const res = await fetch(`${server.baseUrl}${address}`);
    assert.equal(res.status, 404, address);
  }
});

test('without the docs setting the docs addresses do not exist', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  const res = await fetch(`${server.baseUrl}/docs/`);
  assert.equal(res.status, 404);
});
