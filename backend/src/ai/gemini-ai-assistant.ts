import type { AppointmentDraft, AppointmentStatus, Client } from '../domain/types.js';
import type { AiAssistant } from './ai-assistant.js';
import { FallbackAiAssistant } from './fallback-ai-assistant.js';

export class GeminiAiAssistant implements AiAssistant {
  private readonly fallback = new FallbackAiAssistant();

  constructor(
    private readonly apiKey: string | undefined,
    private readonly model: string = 'gemini-flash-latest',
  ) {}

  /** Gemini kullanılamazsa nedenini sunucu günlüğüne yazar (anahtar asla yazılmaz). */
  private warn(what: string, reason: string): void {
    const safe = this.apiKey ? reason.split(this.apiKey).join('***') : reason;
    console.warn(`Gemini kullanılamadı (${what}, model ${this.model}): ${safe}`);
  }

  private async describeHttpError(response: Response): Promise<string> {
    let detail = '';
    try {
      const body = (await response.json()) as { error?: { status?: string; message?: string } };
      detail = [body.error?.status, body.error?.message].filter(Boolean).join(' - ');
    } catch {
      // gövde JSON değilse sadece durum kodu yazılır
    }
    return `HTTP ${response.status}${detail ? ` ${detail}` : ''}`;
  }

  async parseAppointmentPrompt(input: {
    prompt: string;
    referenceDate: string;
    clients: Pick<Client, 'id' | 'firstName' | 'lastName'>[];
  }): Promise<AppointmentDraft> {
    if (!this.apiKey) {
      return this.fallback.parseAppointmentPrompt(input);
    }

    try {
      const promptText = `Sen bir randevu asistanısın. Aşağıdaki kullanıcı komutunu ayrıştır ve JSON formatında döndür.
Referans Tarih: ${input.referenceDate}
Kayıtlı Danışanlar: ${JSON.stringify(input.clients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })))}

Kullanıcı Komutu: "${input.prompt}"

Çıktı tam olarak şu JSON şemasında olmalıdır (başka hiçbir metin veya markdown olmadan sadece ham JSON):
{
  "clientId": "eşleşen danışan id'si veya null",
  "suggestedClient": {"firstName": "isim", "lastName": "soyisim"} veya null,
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "note": "randevu notu"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(8000),
        },
      );

      if (!response.ok) {
        this.warn('randevu komutu', await this.describeHttpError(response));
        return this.fallback.parseAppointmentPrompt(input);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return this.fallback.parseAppointmentPrompt(input);

      const parsed = JSON.parse(text) as AppointmentDraft;
      return {
        clientId: parsed.clientId ?? null,
        suggestedClient: parsed.suggestedClient ?? null,
        date: parsed.date || input.referenceDate,
        startTime: parsed.startTime || '09:00',
        endTime: parsed.endTime || '10:00',
        note: parsed.note || 'Randevu',
      };
    } catch (error) {
      // Ağ hatası, zaman aşımı veya geçersiz JSON durumunda yerel yedeğe düş (neden günlüğe yazılır)
      this.warn('randevu komutu', error instanceof Error ? error.message : String(error));
      return this.fallback.parseAppointmentPrompt(input);
    }
  }

  async summarizeClientHistory(input: {
    clientName: string;
    upcomingAppointment: { date: string; startTime: string; note: string };
    pastAppointments: { date: string; status: AppointmentStatus; note: string }[];
  }): Promise<string> {
    if (!this.apiKey) {
      return this.fallback.summarizeClientHistory(input);
    }

    try {
      const promptText = `Sen serbest çalışan bir uzman için seans öncesi hazırlık asistanısın.
Danışan: ${input.clientName}
Yaklaşan Seans: ${input.upcomingAppointment.date} ${input.upcomingAppointment.startTime} - Not: ${input.upcomingAppointment.note || 'Belirtilmemiş'}
Geçmiş Seanslar: ${JSON.stringify(input.pastAppointments)}

Lütfen danışman seansa girmeden önce okuması için en fazla 3 maddelik, Türkçe, nazik ve profesyonel bir seans öncesi brifing özeti hazırla. Emoji kullanma.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
          }),
          signal: AbortSignal.timeout(8000),
        },
      );

      if (!response.ok) {
        this.warn('seans özeti', await this.describeHttpError(response));
        return this.fallback.summarizeClientHistory(input);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text?.trim() || this.fallback.summarizeClientHistory(input);
    } catch (error) {
      this.warn('seans özeti', error instanceof Error ? error.message : String(error));
      return this.fallback.summarizeClientHistory(input);
    }
  }
}
