// Randevu saatleri İstanbul saatiyle (UTC+3, yaz saati yok) girilir. Sunucu başka bir saat diliminde
// (örn. Render'da UTC) çalışsa da hesaplar aynı kalsın diye saat dilimi açıkça verilir.
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Verilen anın İstanbul'daki tarihi (YYYY-MM-DD) ve saati (HH:MM). */
export function istanbulParts(moment: Date): { date: string; time: string } {
  const parts = Object.fromEntries(formatter.formatToParts(moment).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** İstanbul tarih ve saatini, karşılaştırma için dakika sayısına çevirir. */
export function istanbulMinutes(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, min) / 60000;
}
