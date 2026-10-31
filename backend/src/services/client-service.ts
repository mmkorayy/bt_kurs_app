import { randomUUID } from 'node:crypto';
import { notFound } from '../domain/errors.js';
import { foldForSearch } from '../domain/search.js';
import type { Client, ClientInput } from '../domain/types.js';
import type { ClientRepository } from '../repositories/types.js';

export class ClientService {
  constructor(
    private readonly clients: ClientRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  create(userId: string, input: ClientInput): Promise<Client> {
    return this.clients.create({ id: randomUUID(), userId, ...input, deletedAt: null });
  }

  async get(userId: string, id: string): Promise<Client> {
    const client = await this.clients.findById(userId, id);
    if (!client || client.deletedAt !== null) throw notFound('Danışan bulunamadı.');
    return client;
  }

  async search(userId: string, query = ''): Promise<Client[]> {
    const needle = foldForSearch(query.trim());
    const all = await this.clients.listActive(userId);
    return all
      .filter((c) => foldForSearch(`${c.firstName} ${c.lastName}`).includes(needle))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'tr') || a.firstName.localeCompare(b.firstName, 'tr'));
  }

  async update(userId: string, id: string, patch: Partial<ClientInput>): Promise<Client> {
    const client = await this.get(userId, id);
    return this.clients.update({ ...client, ...patch });
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const client = await this.get(userId, id);
    await this.clients.update({ ...client, deletedAt: this.clock().toISOString() });
  }
}
