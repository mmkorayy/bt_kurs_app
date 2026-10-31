import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startTestServer } from './test-support.js';

// Her uygulanmış işlem burada listelenir; openapi.yaml ile birebir aynı olmalıdır.
const ROUTES = [
  'GET /health',
  'POST /auth/login',
  'POST /auth/logout',
  'GET /auth/me',
  'GET /clients',
  'POST /clients',
  'GET /clients/{id}',
  'PATCH /clients/{id}',
  'DELETE /clients/{id}',
  'GET /appointments',
  'POST /appointments',
  'GET /appointments/{id}',
  'PATCH /appointments/{id}',
  'DELETE /appointments/{id}',
];

const CONTRACT = path.resolve(import.meta.dirname, '../../api-contract/openapi.yaml');
const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

function contractOperations(yaml: string): string[] {
  const operations: string[] = [];
  let current: string | null = null;
  for (const line of yaml.split('\n')) {
    if (/^\S/.test(line)) current = null;
    const pathMatch = /^ {2}(\/\S*):\s*$/.exec(line);
    if (pathMatch) current = pathMatch[1];
    const methodMatch = /^ {4}([a-z]+):\s*$/.exec(line);
    if (current && methodMatch && METHODS.has(methodMatch[1])) {
      operations.push(`${methodMatch[1].toUpperCase()} ${current}`);
    }
  }
  return operations;
}

test('openapi.yaml lists exactly the implemented operations', () => {
  const documented = contractOperations(fs.readFileSync(CONTRACT, 'utf8')).sort();
  assert.deepEqual(documented, [...ROUTES].sort());
});

test('every listed operation exists on the real server', async (t) => {
  const server = startTestServer();
  t.after(() => server.close());
  for (const route of ROUTES) {
    const [method, template] = route.split(' ');
    const res = await fetch(`${server.baseUrl}/api/v1${template.replace('{id}', 'x')}`, { method });
    const body = res.status === 404 ? ((await res.json()) as { error: { message: string } }) : undefined;
    assert.notEqual(body?.error.message, 'Adres bulunamadı.', `${route} is not served`);
  }
});
