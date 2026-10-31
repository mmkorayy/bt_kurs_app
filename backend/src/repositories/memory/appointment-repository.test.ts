import test from 'node:test';
import assert from 'node:assert/strict';
import type { Appointment } from '../../domain/types.js';
import { MemoryAppointmentRepository } from './appointment-repository.js';

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  userId: 'u1',
  clientId: 'c1',
  date: '2026-11-02',
  startTime: '10:00',
  endTime: '11:00',
  status: 'scheduled',
  note: '',
  ...over,
});

test('saveIfNoConflict rejects an overlapping appointment and stores nothing', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  const result = await repo.saveIfNoConflict(appt({ id: 'a2', startTime: '10:30', endTime: '11:30' }));
  assert.equal(result, undefined);
  assert.equal(await repo.findById('u1', 'a2'), undefined);
});

test('saveIfNoConflict allows an appointment that starts when another ends', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  const result = await repo.saveIfNoConflict(appt({ id: 'a2', startTime: '11:00', endTime: '12:00' }));
  assert.equal(result?.id, 'a2');
});

test('a cancelled appointment does not block its slot', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt({ status: 'cancelled' }));
  const result = await repo.saveIfNoConflict(appt({ id: 'a2' }));
  assert.equal(result?.id, 'a2');
});

test('saving a cancelled appointment never conflicts', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  const result = await repo.saveIfNoConflict(appt({ id: 'a2', status: 'cancelled' }));
  assert.equal(result?.id, 'a2');
});

test('saving the same id again does not conflict with itself', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  const result = await repo.saveIfNoConflict(appt({ endTime: '11:30' }));
  assert.equal(result?.endTime, '11:30');
});

test('a different user may use an overlapping slot', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  const result = await repo.saveIfNoConflict(appt({ id: 'b1', userId: 'u2' }));
  assert.equal(result?.id, 'b1');
});

test('listByDateRange is inclusive, user-scoped and sorted', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt({ id: 'late', date: '2026-11-03', startTime: '09:00', endTime: '10:00' }));
  await repo.saveIfNoConflict(appt({ id: 'second', startTime: '14:00', endTime: '15:00' }));
  await repo.saveIfNoConflict(appt({ id: 'first', startTime: '08:00', endTime: '09:00' }));
  await repo.saveIfNoConflict(appt({ id: 'outside', date: '2026-11-04' }));
  await repo.saveIfNoConflict(appt({ id: 'other-user', userId: 'u2' }));
  const ids = (await repo.listByDateRange('u1', '2026-11-02', '2026-11-03')).map((a) => a.id);
  assert.deepEqual(ids, ['first', 'second', 'late']);
});

test('delete removes the user own appointment and refuses another user', async () => {
  const repo = new MemoryAppointmentRepository();
  await repo.saveIfNoConflict(appt());
  assert.equal(await repo.delete('u2', 'a1'), false);
  assert.equal(await repo.delete('u1', 'a1'), true);
  assert.equal(await repo.findById('u1', 'a1'), undefined);
});
