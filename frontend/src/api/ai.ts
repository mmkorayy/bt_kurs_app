import { request } from './client';
import type { AppointmentDraft } from './types';

/** Türkçe bir cümleden randevu taslağı ister. `referenceDate` "yarın" gibi sözlerin hesaplandığı gündür. */
export async function parseAppointmentPrompt(prompt: string, referenceDate?: string): Promise<AppointmentDraft> {
  const result = await request<{ draft: AppointmentDraft }>('/ai/parse-appointment', {
    method: 'POST',
    body: { prompt, referenceDate },
  });
  return result.draft;
}
