import { request } from './client';
import type { Client, ClientInput } from './types';

/** Aktif danışanları soyada, sonra ada göre sıralı getirir. `search` verilirse adda ve soyadda arar. */
export async function listClients(search?: string): Promise<Client[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const result = await request<{ clients: Client[] }>(`/clients${query}`);
  return result.clients;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const result = await request<{ client: Client }>('/clients', { method: 'POST', body: input });
  return result.client;
}

export async function updateClient(id: string, patch: Partial<ClientInput>): Promise<Client> {
  const result = await request<{ client: Client }>(`/clients/${id}`, { method: 'PATCH', body: patch });
  return result.client;
}

export async function deleteClient(id: string): Promise<void> {
  await request<void>(`/clients/${id}`, { method: 'DELETE' });
}
