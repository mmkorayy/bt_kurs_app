import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../domain/errors.js';
import type { AppointmentInput, Client } from '../domain/types.js';
import { MemoryAppointmentRepository } from '../repositories/memory/appointment-repository.js';
import { MemoryClientRepository } from '../repositories/memory/client-repository.js';
import { AppointmentService } from './appointment-service.js';

const slot = (over: Partial<AppointmentInput> = {}): AppointmentInput => ({
  clientId: 'c1',
  date: '2026-11-02',
  startTime: '10:00',
  endTime: '11:00',
  status: 'scheduled',
  note: '',
  ...over,
});

function setup() {
  const clients = new MemoryClientRepository();
  const service = new AppointmentService(new MemoryAppointmentRepository(), clients);
  const addClient = (userId: string, id: string, over: Partial<Client> = {}) =>
    clients.create({
      id,
      userId,
      firstName: 'Elif',
      lastName: 'Yıldız',
      birthDate: '1990-05-17',
      gender: 'female',
      deletedAt: null,
      ...over,
    });
  return { clients, service, addClient };
}

const isNotFound = (e: unknown) => e instanceof AppError && e.status === 404 && e.code === 'not_found';
const isConflict = (e: unknown) => e instanceof AppError && e.status === 409 && e.code === 'conflict';
const isValidation = (e: unknown) => e instanceof AppError && e.status === 400 && e.code === 'validation_error';

test('creating with another user client id is not found', async () => {
  const { service, addClient } = setup();
  await addClient('u2', 'c1');
  await assert.rejects(() => service.create('u1', slot()), isNotFound);
});

test('creating with a deleted client is not found', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1', { deletedAt: '2026-11-01T10:00:00.000Z' });
  await assert.rejects(() => service.create('u1', slot()), isNotFound);
});

test('an overlapping appointment is a conflict', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  await service.create('u1', slot());
  await assert.rejects(() => service.create('u1', slot({ startTime: '10:30', endTime: '11:30' })), isConflict);
});

test('an appointment starting when another ends is allowed', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  await service.create('u1', slot());
  const next = await service.create('u1', slot({ startTime: '11:00', endTime: '12:00' }));
  assert.equal(next.startTime, '11:00');
});

test('cancelling an appointment frees its slot', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  const first = await service.create('u1', slot());
  await service.update('u1', first.id, { status: 'cancelled' });
  const again = await service.create('u1', slot());
  assert.equal(again.status, 'scheduled');
});

test('editing an appointment time does not conflict with itself', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  const created = await service.create('u1', slot());
  const updated = await service.update('u1', created.id, { endTime: '11:30' });
  assert.equal(updated.endTime, '11:30');
});

test('moving a cancelled appointment back to scheduled into a taken slot is a conflict', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  const first = await service.create('u1', slot());
  await service.update('u1', first.id, { status: 'cancelled' });
  await service.create('u1', slot());
  await assert.rejects(() => service.update('u1', first.id, { status: 'scheduled' }), isConflict);
});

test('an end time before the start time in a patch is a validation error', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  const created = await service.create('u1', slot());
  await assert.rejects(() => service.update('u1', created.id, { endTime: '09:00' }), isValidation);
});

test('another user gets not found for the appointment', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  const created = await service.create('u1', slot());
  await assert.rejects(() => service.get('u2', created.id), isNotFound);
  await assert.rejects(() => service.remove('u2', created.id), isNotFound);
});

test('the list still shows the client name after the client is soft deleted', async () => {
  const { service, clients, addClient } = setup();
  await addClient('u1', 'c1');
  await service.create('u1', slot());
  await clients.update({
    id: 'c1',
    userId: 'u1',
    firstName: 'Elif',
    lastName: 'Yıldız',
    birthDate: '1990-05-17',
    gender: 'female',
    deletedAt: '2026-11-01T10:00:00.000Z',
  });
  const [view] = await service.list('u1', '2026-11-02', '2026-11-02');
  assert.deepEqual(view.client, { id: 'c1', firstName: 'Elif', lastName: 'Yıldız' });
});

test('remove deletes the appointment for good', async () => {
  const { service, addClient } = setup();
  await addClient('u1', 'c1');
  const created = await service.create('u1', slot());
  await service.remove('u1', created.id);
  await assert.rejects(() => service.get('u1', created.id), isNotFound);
  await assert.rejects(() => service.remove('u1', created.id), isNotFound);
});
