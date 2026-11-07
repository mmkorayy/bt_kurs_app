import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveStaticDir } from './static-dir.js';

function makeRepoRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bookpal-root-'));
}

test('uses frontend/dist when its index.html exists', () => {
  const root = makeRepoRoot();
  fs.mkdirSync(path.join(root, 'frontend', 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'frontend', 'dist', 'index.html'), '');
  assert.equal(resolveStaticDir(root), path.join(root, 'frontend', 'dist'));
});

test('falls back to web when frontend/dist has no index.html', () => {
  const root = makeRepoRoot();
  assert.equal(resolveStaticDir(root), path.join(root, 'web'));
});
