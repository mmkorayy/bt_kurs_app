import type { AppointmentDraft, AppointmentStatus, Client } from '../domain/types.js';
import type { AiAssistant } from './ai-assistant.js';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addOneHour(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const nextHour = (h + 1) % 24;
  return `${pad(nextHour)}:${pad(m)}`;
}

export class FallbackAiAssistant implements AiAssistant {
  async parseAppointmentPrompt(input: {
    prompt: string;
    referenceDate: string;
    clients: Pick<Client, 'id' | 'firstName' | 'lastName'>[];
  }): Promise<AppointmentDraft> {
    const text = input.prompt.trim();
    const lower = text.toLocaleLowerCase('tr-TR');

    // 1. Tarih ayrıştırma
    let date = input.referenceDate;
    if (lower.includes('öbür gün')) {
      date = addDaysToDate(input.referenceDate, 2);
    } else if (lower.includes('yarın')) {
      date = addDaysToDate(input.referenceDate, 1);
    } else if (lower.includes('bugün')) {
      date = input.referenceDate;
    } else {
      const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
      const trMatch = text.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
      if (isoMatch) {
        date = isoMatch[0];
      } else if (trMatch) {
        date = `${trMatch[3]}-${pad(Number(trMatch[2]))}-${pad(Number(trMatch[1]))}`;
      }
    }

    // 2. Saat ayrıştırma
    let startTime = '09:00';
    let endTime = '10:00';

    const rangeMatch = text.match(/\b(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\b/);
    const singleMatch = text.match(/\b(?:saat\s*)?(\d{1,2})[:.](\d{2})\b/i);
    const hourOnlyMatch = text.match(/\bsaat\s*(\d{1,2})\b/i);

    if (rangeMatch) {
      startTime = `${pad(Number(rangeMatch[1]))}:${rangeMatch[2]}`;
      endTime = `${pad(Number(rangeMatch[3]))}:${rangeMatch[4]}`;
    } else if (singleMatch) {
      startTime = `${pad(Number(singleMatch[1]))}:${singleMatch[2]}`;
      endTime = addOneHour(startTime);
    } else if (hourOnlyMatch) {
      startTime = `${pad(Number(hourOnlyMatch[1]))}:00`;
      endTime = addOneHour(startTime);
    }

    // 3. Danışan eşleştirme
    let clientId: string | null = null;
    let suggestedClient: { firstName: string; lastName: string } | null = null;

    let matchedClientName = '';
    for (const c of input.clients) {
      const fullName = `${c.firstName} ${c.lastName}`.toLocaleLowerCase('tr-TR');
      if (lower.includes(fullName)) {
        clientId = c.id;
        matchedClientName = fullName;
        break;
      }
    }

    if (!clientId) {
      // Cümlede geçen iki kelimelik büyük harfli ad-soyad adayını arayalım
      const nameMatch = text.match(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\b/);
      if (nameMatch) {
        suggestedClient = { firstName: nameMatch[1], lastName: nameMatch[2] };
        matchedClientName = `${nameMatch[1]} ${nameMatch[2]}`.toLocaleLowerCase('tr-TR');
      }
    }

    // 4. Not kısmı: Cümleden tarih, saat ve isim kelimelerini temizle
    let note = text;
    if (matchedClientName) {
      note = note.replace(new RegExp(matchedClientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }
    note = note
      .replace(/\b(bugün|yarın|öbür gün|saat)\b/gi, '')
      .replace(/\b\d{1,2}[:.]\d{2}(?:\s*[-–]\s*\d{1,2}[:.]\d{2})?\b/g, '')
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
      .replace(/\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      clientId,
      suggestedClient,
      date,
      startTime,
      endTime,
      note: note || 'Randevu',
    };
  }

  async summarizeClientHistory(input: {
    clientName: string;
    upcomingAppointment: { date: string; startTime: string; note: string };
    pastAppointments: { date: string; status: AppointmentStatus; note: string }[];
  }): Promise<string> {
    if (input.pastAppointments.length === 0) {
      return `Sayın ${input.clientName} ile daha önce kayıtlı seans bulunmuyor.`;
    }

    const past = [...input.pastAppointments].sort((a, b) => b.date.localeCompare(a.date));
    const recent = past.slice(0, 3);

    const lines = [
      `Danışan: ${input.clientName}`,
      `Toplam Geçmiş Seans: ${input.pastAppointments.length}`,
      `Yaklaşan Seans: ${input.upcomingAppointment.date} ${input.upcomingAppointment.startTime} (${input.upcomingAppointment.note || 'Not yok'})`,
      'Son Görüşmeler:',
    ];

    for (const p of recent) {
      lines.push(`- ${p.date} (${p.status}): ${p.note || 'Not belirtilmemiş'}`);
    }

    return lines.join('\n');
  }
}
