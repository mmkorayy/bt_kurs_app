import { randomUUID } from 'node:crypto';
import { conflict, notFound, validationError } from '../domain/errors.js';
import type { Appointment, AppointmentInput } from '../domain/types.js';
import type { AppointmentRepository, ClientRepository } from '../repositories/types.js';

export interface AppointmentView extends Appointment {
  client: { id: string; firstName: string; lastName: string };
}

export class AppointmentService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clients: ClientRepository,
  ) {}

  async list(userId: string, from: string, to: string): Promise<AppointmentView[]> {
    const found = await this.appointments.listByDateRange(userId, from, to);
    return Promise.all(found.map((a) => this.toView(a)));
  }

  async get(userId: string, id: string): Promise<AppointmentView> {
    return this.toView(await this.find(userId, id));
  }

  async create(userId: string, input: AppointmentInput): Promise<AppointmentView> {
    await this.requireActiveClient(userId, input.clientId);
    return this.save({ id: randomUUID(), userId, ...input });
  }

  async update(userId: string, id: string, patch: Partial<AppointmentInput>): Promise<AppointmentView> {
    const existing = await this.find(userId, id);
    const merged: Appointment = { ...existing, ...patch };
    if (merged.endTime <= merged.startTime) {
      throw validationError('Bitiş saati başlangıç saatinden sonra olmalıdır.');
    }
    if (merged.clientId !== existing.clientId) {
      await this.requireActiveClient(userId, merged.clientId);
    }
    return this.save(merged);
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.appointments.delete(userId, id))) throw notFound('Randevu bulunamadı.');
  }

  private async save(appointment: Appointment): Promise<AppointmentView> {
    const saved = await this.appointments.saveIfNoConflict(appointment);
    if (!saved) throw conflict('Bu saat aralığında başka bir randevunuz var.');
    return this.toView(saved);
  }

  private async find(userId: string, id: string): Promise<Appointment> {
    const appointment = await this.appointments.findById(userId, id);
    if (!appointment) throw notFound('Randevu bulunamadı.');
    return appointment;
  }

  private async requireActiveClient(userId: string, clientId: string): Promise<void> {
    const client = await this.clients.findById(userId, clientId);
    if (!client || client.deletedAt !== null) throw notFound('Danışan bulunamadı.');
  }

  private async toView(appointment: Appointment): Promise<AppointmentView> {
    const client = await this.clients.findById(appointment.userId, appointment.clientId);
    if (!client) throw notFound('Danışan bulunamadı.');
    return {
      ...appointment,
      client: { id: client.id, firstName: client.firstName, lastName: client.lastName },
    };
  }
}
