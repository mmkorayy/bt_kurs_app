import test from 'node:test';
import assert from 'node:assert/strict';
import { foldForSearch } from './search.js';

test('foldForSearch treats dotted and dotless i the same', () => {
  assert.equal(foldForSearch('İlker'), foldForSearch('ilker'));
  assert.equal(foldForSearch('IŞIK'), foldForSearch('ışık'));
});

test('foldForSearch strips accents and ignores case', () => {
  assert.equal(foldForSearch('Çağla'), 'cagla');
});
