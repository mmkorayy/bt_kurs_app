import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveStaticDir } from './static-dir.js';

function makeRepoRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bookpal-root-'));
}

test('always points at frontend/dist', () => {
  const root = makeRepoRoot();
  assert.equal(resolveStaticDir(root), path.join(root, 'frontend', 'dist'));
});
