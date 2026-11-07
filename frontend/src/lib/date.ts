// Tarihler YYYY-MM-DD metni olarak taşınır ve yerel saatte işlenir.
// toISOString() ve Date.parse kullanılmaz: Türkiye saatinde (UTC+3) günü bir geri kaydırabilir.

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Gerçek bir takvim günüyse yerel saatte gece yarısındaki Date'i, değilse undefined döndürür. */
export function parseDate(value: string): Date | undefined {
  const match = DATE_PATTERN.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

export function today(): string {
  return toDateString(new Date());
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  if (!date) throw new Error(`Geçersiz tarih: ${value}`);
  return toDateString(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** "7 Kasım Cumartesi" */
export function formatLong(value: string): string {
  const date = parseDate(value);
  if (!date) throw new Error(`Geçersiz tarih: ${value}`);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${WEEKDAYS[date.getDay()]}`;
}

/** `?tarih=` değerini okur; yoksa ya da bozuksa bugünü verir. */
export function dateFromQuery(value: string | null): string {
  if (value && parseDate(value)) return value;
  return today();
}
