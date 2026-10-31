import type { Client } from '../../domain/types.js';
import type { ClientRepository } from '../types.js';

export class MemoryClientRepository implements ClientRepository {
  private readonly clients = new Map<string, Client>();

  async create(client: Client): Promise<Client> {
    this.clients.set(client.id, client);
    return client;
  }

  async findById(userId: string, id: string): Promise<Client | undefined> {
    const client = this.clients.get(id);
    return client?.userId === userId ? client : undefined;
  }

  async listActive(userId: string): Promise<Client[]> {
    return [...this.clients.values()].filter((c) => c.userId === userId && c.deletedAt === null);
  }

  async update(client: Client): Promise<Client> {
    this.clients.set(client.id, client);
    return client;
  }
}
