import type { AppointmentStatus, Gender } from '../api/types';

const GENDER_LABELS: Record<Gender, string> = {
  female: 'Kadın',
  male: 'Erkek',
  other: 'Diğer',
  undisclosed: 'Belirtmek istemiyorum',
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export function genderLabel(gender: Gender): string {
  return GENDER_LABELS[gender];
}

export function statusLabel(status: AppointmentStatus): string {
  return STATUS_LABELS[status];
}

/** YYYY-MM-DD metnini GG.AA.YYYY yapar. Tarih nesnesi kullanılmaz, gün kayması olmaz. */
export function formatShortDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}
