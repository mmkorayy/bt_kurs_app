import { request } from './client';
import type { AppointmentInput, AppointmentView } from './types';

/** `from` ve `to` dahil; gün, hafta ve ay görünümleri aynı çağrıyı kullanır. */
export async function listAppointments(from: string, to: string): Promise<AppointmentView[]> {
  const result = await request<{ appointments: AppointmentView[] }>(`/appointments?from=${from}&to=${to}`);
  return result.appointments;
}

export async function createAppointment(input: AppointmentInput): Promise<AppointmentView> {
  const result = await request<{ appointment: AppointmentView }>('/appointments', { method: 'POST', body: input });
  return result.appointment;
}

export async function updateAppointment(id: string, patch: Partial<AppointmentInput>): Promise<AppointmentView> {
  const result = await request<{ appointment: AppointmentView }>(`/appointments/${id}`, {
    method: 'PATCH',
    body: patch,
  });
  return result.appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  await request<void>(`/appointments/${id}`, { method: 'DELETE' });
}
