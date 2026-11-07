// Bellek ve Postgres randevu depolarının ikisinin de geçmesi gereken ortak davranış testleri.
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Appointment } from '../../domain/types.js';
import type { AppointmentRepository } from '../types.js';
import type { RepoContext } from './client-repository.contract.js';

export type AppointmentSetup = {
  repo: AppointmentRepository;
  /** Postgres'te yabancı anahtar için bu id'li bir `clients` satırının var olmasını sağlar (kullanıcı önce `seedUser` ile eklenmiş olmalı); bellekte bir şey yapmaz. */
  seedClient(userId: string, clientId: string): Promise<void>;
} & RepoContext;

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  userId: 'u1',
  clientId: 'c1',
  date: '2026-11-05',
  startTime: '10:00',
  endTime: '11:00',
  status: 'scheduled',
  note: '',
  ...over,
});

async function ready(setup: () => Promise<AppointmentSetup>, users: string[] = ['u1']): Promise<AppointmentSetup> {
  const context = await setup();
  for (const user of users) {
    await context.seedUser(user);
    await context.seedClient(user, 'c1');
  }
  return context;
}

export function appointmentRepositoryContract(
  label: string,
  setup: () => Promise<AppointmentSetup>,
  options: { skip?: boolean } = {},
): void {
  const { skip = false } = options;

  test(`${label}: date and times read back unchanged`, { skip }, async () => {
    const { repo } = await ready(setup);
    await repo.saveIfNoConflict(appt({ startTime: '09:30', endTime: '10:15', note: 'ilk görüşme' }));
    assert.deepEqual(await repo.findById('u1', 'a1'), appt({ startTime: '09:30', endTime: '10:15', note: 'ilk görüşme' }));
  });

  test(`${label}: an overlapping appointment is refused and nothing is written`, { skip }, async () => {
    const { repo } = await ready(setup);
    await repo.saveIfNoConflict(appt());
    assert.equal(await repo.saveIfNoConflict(appt({ id: 'a2', startTime: '10:30', endTime: '11:30' })), undefined);
    assert.equal(await repo.findById('u1', 'a2'), undefined);
  });

  test(`${label}: back-to-back appointments are both accepted`, { skip }, async () => {
    const { repo } = await ready(setup);
    assert.equal((await repo.saveIfNoConflict(appt()))?.id, 'a1');
    assert.equal((await repo.saveIfNoConflict(appt({ id: 'a2', startTime: '11:00', endTime: '12:00' })))?.id, 'a2');
  });

  test(`${label}: a cancelled appointment does not hold its slot`, { skip }, async () => {
    const { repo } = await ready(setup);
    await repo.saveIfNoConflict(appt({ status: 'cancelled' }));
    assert.equal((await repo.saveIfNoConflict(appt({ id: 'a2' })))?.id, 'a2');
  });

  test(`${label}: saving a cancelled appointment never conflicts`, { skip }, async () => {
    const { repo } = await ready(setup);
    await repo.saveIfNoConflict(appt());
    assert.equal((await repo.saveIfNoConflict(appt({ id: 'a2', status: 'cancelled' })))?.id, 'a2');
  });

  test(`${label}: turning a cancelled appointment back into scheduled in a taken slot is refused`, { skip }, async () => {
    const { repo } = await ready(setup);
    await repo.saveIfNoConflict(appt({ status: 'cancelled' }));
    await repo.saveIfNoConflict(appt({ id: 'a2' }));
    assert.equal(await repo.saveIfNoConflict(appt({ status: 'scheduled' })), undefined);
    assert.equal((await repo.findById('u1', 'a1'))?.status, 'cancelled');
  });

  test(`${label}: saving the same id again updates it and does not conflict with itself`, { skip }, async () => {
    const { repo } = await ready(setup);
    await repo.saveIfNoConflict(appt());
    const saved = await repo.saveIfNoConflict(appt({ endTime: '11:30', note: 'uzadı' }));
    assert.equal(saved?.endTime, '11:30');
    assert.deepEqual(await repo.findById('u1', 'a1'), appt({ endTime: '11:30', note: 'uzadı' }));
  });

  test(`${label}: another user may use an overlapping slot`, { skip }, async () => {
    const { repo } = await ready(setup, ['u1', 'u2']);
    await repo.saveIfNoConflict(appt());
    assert.equal((await repo.saveIfNoConflict(appt({ id: 'b1', userId: 'u2' })))?.id, 'b1');
  });

  test(`${label}: findById and delete never touch another user's appointment`, { skip }, async () => {
    const { repo } = await ready(setup, ['u1', 'u2']);
    await repo.saveIfNoConflict(appt());
    assert.equal(await repo.findById('u2', 'a1'), undefined);
    assert.equal(await repo.delete('u2', 'a1'), false);
    assert.equal(await repo.delete('u1', 'a1'), true);
    assert.equal(await repo.findById('u1', 'a1'), undefined);
    assert.equal(await repo.delete('u1', 'a1'), false);
  });

  test(`${label}: listByDateRange is inclusive at both ends, user-scoped and sorted`, { skip }, async () => {
    const { repo } = await ready(setup, ['u1', 'u2']);
    await repo.saveIfNoConflict(appt({ id: 'late', date: '2026-11-06', startTime: '09:00', endTime: '10:00' }));
    await repo.saveIfNoConflict(appt({ id: 'second', startTime: '14:00', endTime: '15:00' }));
    await repo.saveIfNoConflict(appt({ id: 'first', startTime: '08:00', endTime: '09:00' }));
    await repo.saveIfNoConflict(appt({ id: 'outside', date: '2026-11-07' }));
    await repo.saveIfNoConflict(appt({ id: 'other-user', userId: 'u2' }));
    const ids = (await repo.listByDateRange('u1', '2026-11-05', '2026-11-06')).map((a) => a.id);
    assert.deepEqual(ids, ['first', 'second', 'late']);
  });

  test(`${label}: two simultaneous saves for one slot, exactly one wins`, { skip }, async () => {
    const { repo } = await ready(setup);
    const results = await Promise.all([
      repo.saveIfNoConflict(appt({ id: 'x1' })),
      repo.saveIfNoConflict(appt({ id: 'x2', startTime: '10:30', endTime: '11:30' })),
    ]);
    assert.equal(results.filter((result) => result === undefined).length, 1);
    assert.equal((await repo.listByDateRange('u1', '2026-11-05', '2026-11-05')).length, 1);
  });
}
