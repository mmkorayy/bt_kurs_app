// Tarihler YYYY-MM-DD metni olarak taşınır ve yerel saatte işlenir.
// toISOString() ve Date.parse kullanılmaz: Türkiye saatinde (UTC+3) günü bir geri kaydırabilir.

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Pazartesi'den başlayan kısa gün adları (hafta ve ay görünümleri). */
export const WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Kabul edilen yıllar: 1900-2100 (komşu aylar/haftalar da bu aralıkta kalsın diye adresten yalnızca 1901-2099 okunur). */
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export function toDateString(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Gerçek bir takvim günüyse yerel saatte gece yarısındaki Date'i, değilse undefined döndürür. */
export function parseDate(value: string): Date | undefined {
  const match = DATE_PATTERN.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_YEAR || year > MAX_YEAR) return undefined;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

export function today(): string {
  return toDateString(new Date());
}

function mustParse(value: string): Date {
  const date = parseDate(value);
  if (!date) throw new Error(`Geçersiz tarih: ${value}`);
  return date;
}

export function addDays(value: string, days: number): string {
  const date = mustParse(value);
  return toDateString(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** "7 Kasım Cumartesi" */
export function formatLong(value: string): string {
  const date = mustParse(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${WEEKDAYS[date.getDay()]}`;
}

/** `?tarih=` değerini okur; yoksa, bozuksa ya da 1901-2099 dışındaysa bugünü verir. */
export function dateFromQuery(value: string | null): string {
  const date = value ? parseDate(value) : undefined;
  if (date && date.getFullYear() > MIN_YEAR && date.getFullYear() < MAX_YEAR) return value as string;
  return today();
}

/** Verilen günün haftasının Pazartesi'si (hafta Pazartesi'den başlar). */
export function weekStart(value: string): string {
  const date = mustParse(value);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return addDays(value, -daysSinceMonday);
}

/** Pazartesi'den Pazar'a yedi gün. */
export function weekDays(value: string): string[] {
  const start = weekStart(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Ayın ilk ve son günü. */
export function monthRange(value: string): { from: string; to: string } {
  const date = mustParse(value);
  return {
    from: toDateString(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: toDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

/** Ayı kapsayan Pazartesi'den başlayan haftalar; her satır 7 gün. */
export function monthGrid(value: string): string[][] {
  const { from, to } = monthRange(value);
  const start = weekStart(from);
  const end = weekDays(to)[6];
  const rows: string[][] = [];
  for (let rowStart = start; rowStart <= end; rowStart = addDays(rowStart, 7)) {
    rows.push(weekDays(rowStart));
  }
  return rows;
}

/** `n` ay sonrasının (ya da öncesinin) ilk günü. */
export function addMonths(value: string, months: number): string {
  const date = mustParse(value);
  return toDateString(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

/** "Kasım 2026" */
export function formatMonth(value: string): string {
  const date = mustParse(value);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Haftanın Pazartesi–Pazar aralığı: "2 – 8 Kasım 2026", "26 Ekim – 1 Kasım 2026". */
export function formatWeekRange(value: string): string {
  const first = mustParse(weekStart(value));
  const last = mustParse(addDays(weekStart(value), 6));
  if (first.getFullYear() !== last.getFullYear()) {
    return `${first.getDate()} ${MONTHS[first.getMonth()]} ${first.getFullYear()} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  }
  if (first.getMonth() !== last.getMonth()) {
    return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  }
  return `${first.getDate()} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
}

/** Randevuları veya öğeleri önce tarihe (artan), eşitse başlangıç saatine (artan) göre sıralar. */
export function compareDateAndTime(
  a: { date: string; startTime: string },
  b: { date: string; startTime: string },
): number {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

