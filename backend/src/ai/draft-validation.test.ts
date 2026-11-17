import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppointmentDraft } from '../domain/types.js';
import { sanitizeDraft } from './draft-validation.js';

const base: AppointmentDraft = {
  clientId: 'c1',
  suggestedClient: null,
  date: '2026-11-03',
  startTime: '14:00',
  endTime: '15:00',
  note: 'kontrol',
};
const ctx = { referenceDate: '2026-11-02', clientIds: ['c1'] };

test('a valid draft passes unchanged', () => {
  assert.deepEqual(sanitizeDraft(base, ctx), base);
});

test('a client id that is not one of the user clients is dropped', () => {
  assert.equal(sanitizeDraft({ ...base, clientId: 'someone-else' }, ctx).clientId, null);
});

test('an impossible date falls back to the reference date', () => {
  assert.equal(sanitizeDraft({ ...base, date: '2026-02-31' }, ctx).date, '2026-11-02');
  assert.equal(sanitizeDraft({ ...base, date: 'yarın' }, ctx).date, '2026-11-02');
});

test('an invalid start time is emptied and the end time with it', () => {
  const draft = sanitizeDraft({ ...base, startTime: '25:00', endTime: '26:00' }, ctx);
  assert.equal(draft.startTime, '');
  assert.equal(draft.endTime, '');
});

test('an end time that is not after the start becomes one hour later, capped at 23:59', () => {
  assert.equal(sanitizeDraft({ ...base, endTime: '13:00' }, ctx).endTime, '15:00');
  const late = sanitizeDraft({ ...base, startTime: '23:30', endTime: '00:30' }, ctx);
  assert.equal(late.endTime, '23:59');
});
