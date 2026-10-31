import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from './errors.js';
import {
  isValidDate,
  isValidTime,
  parseAppointmentInput,
  parseAppointmentPatch,
  parseClientInput,
  parseClientPatch,
  parseDateRange,
} from './validation.js';

const today = '2026-11-01';
const client = { firstName: 'Elif', lastName: 'Yıldız', birthDate: '1990-05-17', gender: 'female' };
const appointment = { clientId: 'c1', date: '2026-11-02', startTime: '10:00', endTime: '10:30' };

function isValidationError(e: unknown): boolean {
  return e instanceof AppError && e.status === 400 && e.code === 'validation_error';
}

test('isValidDate accepts real dates and rejects impossible or badly formatted ones', () => {
  assert.equal(isValidDate('2026-02-28'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-2-3'), false);
});

test('isValidTime accepts 24-hour HH:mm only', () => {
  assert.equal(isValidTime('00:00'), true);
  assert.equal(isValidTime('23:59'), true);
  assert.equal(isValidTime('24:00'), false);
  assert.equal(isValidTime('9:30'), false);
});

test('parseClientInput trims names and keeps valid values', () => {
  const parsed = parseClientInput({ ...client, firstName: '  Elif ' }, today);
  assert.deepEqual(parsed, client);
});

test('parseClientInput rejects a blank first name', () => {
  assert.throws(() => parseClientInput({ ...client, firstName: '   ' }, today), isValidationError);
});

test('parseClientInput rejects a birth date in the future', () => {
  assert.throws(() => parseClientInput({ ...client, birthDate: '2026-11-02' }, today), isValidationError);
});

test('parseClientInput rejects an unknown gender', () => {
  assert.throws(() => parseClientInput({ ...client, gender: 'x' }, today), isValidationError);
});

test('parseClientInput rejects a body that is not an object', () => {
  assert.throws(() => parseClientInput('text', today), isValidationError);
  assert.throws(() => parseClientInput(null, today), isValidationError);
  assert.throws(() => parseClientInput([], today), isValidationError);
});

test('parseClientPatch rejects an empty patch and accepts a single field', () => {
  assert.throws(() => parseClientPatch({}, today), isValidationError);
  assert.deepEqual(parseClientPatch({ lastName: 'Kaya' }, today), { lastName: 'Kaya' });
});

test('parseAppointmentInput defaults status to scheduled and note to empty', () => {
  assert.deepEqual(parseAppointmentInput(appointment), { ...appointment, status: 'scheduled', note: '' });
});

test('parseAppointmentInput rejects an end time that is not after the start time', () => {
  assert.throws(() => parseAppointmentInput({ ...appointment, endTime: '10:00' }), isValidationError);
  assert.throws(() => parseAppointmentInput({ ...appointment, endTime: '09:00' }), isValidationError);
});

test('parseAppointmentInput rejects a bad status and a non-text note', () => {
  assert.throws(() => parseAppointmentInput({ ...appointment, status: 'done' }), isValidationError);
  assert.throws(() => parseAppointmentInput({ ...appointment, note: 5 }), isValidationError);
});

test('parseAppointmentPatch rejects an empty patch and accepts known fields', () => {
  assert.throws(() => parseAppointmentPatch({}), isValidationError);
  assert.deepEqual(parseAppointmentPatch({ status: 'cancelled' }), { status: 'cancelled' });
});

test('parseDateRange accepts 366 days inclusive and rejects 367', () => {
  assert.deepEqual(parseDateRange('2026-01-01', '2027-01-01'), { from: '2026-01-01', to: '2027-01-01' });
  assert.throws(() => parseDateRange('2026-01-01', '2027-01-02'), isValidationError);
});

test('parseDateRange rejects to before from and missing values', () => {
  assert.throws(() => parseDateRange('2026-02-02', '2026-02-01'), isValidationError);
  assert.throws(() => parseDateRange(undefined, '2026-02-01'), isValidationError);
});
