import type { AppointmentDraft } from '../domain/types.js';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function oneHourLater(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return h + 1 > 23 ? '23:59' : `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Yapay zekâdan (ya da yedek ayrıştırıcıdan) gelen taslak güvenilmez girdidir: kullanıcının kendi
 * danışanı olmayan id atılır, geçersiz tarih ve saat düzeltilir. Form zaten kullanıcıya gösterilir, ama
 * ekranda görünenle gönderilen değer hiçbir zaman ayrışmamalıdır.
 */
export function sanitizeDraft(
  draft: AppointmentDraft,
  context: { referenceDate: string; clientIds: string[] },
): AppointmentDraft {
  const clientId = draft.clientId !== null && context.clientIds.includes(draft.clientId) ? draft.clientId : null;
  const date = isRealDate(draft.date) ? draft.date : context.referenceDate;
  const startTime = TIME.test(draft.startTime) ? draft.startTime : '';
  let endTime = '';
  if (startTime) endTime = TIME.test(draft.endTime) && draft.endTime > startTime ? draft.endTime : oneHourLater(startTime);
  return { ...draft, clientId, date, startTime, endTime };
}
