import test from 'node:test';
import assert from 'node:assert/strict';
import { FallbackAiAssistant } from './fallback-ai-assistant.js';

test('FallbackAiAssistant matches existing client and parses date and time range', async () => {
  const assistant = new FallbackAiAssistant();
  const clients = [{ id: 'c1', firstName: 'Ali', lastName: 'Veli' }];

  const draft = await assistant.parseAppointmentPrompt({
    prompt: 'Yarın 14:00-15:00 Ali Veli kontrol seansı',
    referenceDate: '2026-11-17',
    clients,
  });

  assert.equal(draft.clientId, 'c1');
  assert.equal(draft.suggestedClient, null);
  assert.equal(draft.date, '2026-11-18');
  assert.equal(draft.startTime, '14:00');
  assert.equal(draft.endTime, '15:00');
  assert.match(draft.note, /kontrol seansı/);
});

test('FallbackAiAssistant extracts suggested client when client is not in registered list', async () => {
  const assistant = new FallbackAiAssistant();

  const draft = await assistant.parseAppointmentPrompt({
    prompt: 'Bugün saat 11 Zeynep Kaya ilk seans',
    referenceDate: '2026-11-17',
    clients: [],
  });

  assert.equal(draft.clientId, null);
  assert.deepEqual(draft.suggestedClient, { firstName: 'Zeynep', lastName: 'Kaya' });
  assert.equal(draft.date, '2026-11-17');
  assert.equal(draft.startTime, '11:00');
  assert.equal(draft.endTime, '12:00');
});

test('FallbackAiAssistant summarizes client history', async () => {
  const assistant = new FallbackAiAssistant();

  const emptySummary = await assistant.summarizeClientHistory({
    clientName: 'Ahmet Yılmaz',
    upcomingAppointment: { date: '2026-11-18', startTime: '15:00', note: 'İlk görüşme' },
    pastAppointments: [],
  });
  assert.match(emptySummary, /kayıtlı seans bulunmuyor/);

  const fullSummary = await assistant.summarizeClientHistory({
    clientName: 'Ahmet Yılmaz',
    upcomingAppointment: { date: '2026-11-18', startTime: '15:00', note: 'Takip' },
    pastAppointments: [
      { date: '2026-11-10', status: 'completed', note: 'Beslenme programı verildi' },
    ],
  });
  assert.match(fullSummary, /Toplam Geçmiş Seans: 1/);
  assert.match(fullSummary, /Beslenme programı verildi/);
});

test('a client name with regex characters does not crash the parser', async () => {
  const ai = new FallbackAiAssistant();
  const draft = await ai.parseAppointmentPrompt({
    prompt: 'yarın 10:00 ali [veli kontrol',
    referenceDate: '2026-11-02',
    clients: [{ id: 'c1', firstName: 'ali', lastName: '[veli' }],
  });
  assert.equal(draft.clientId, 'c1');
  assert.equal(draft.note, 'kontrol');
});

test('a weekday word is not taken as part of a new client name', async () => {
  const ai = new FallbackAiAssistant();
  const draft = await ai.parseAppointmentPrompt({ prompt: 'Pazartesi Ali Veli kontrol', referenceDate: '2026-11-02', clients: [] });
  assert.deepEqual(draft.suggestedClient, { firstName: 'Ali', lastName: 'Veli' });
});

const LEBLEBI = [{ id: 'c1', firstName: 'Leblebi', lastName: 'Ütü' }];

test('"saat 2pm\'de" means 14:00 and the time words leave the note', async () => {
  const ai = new FallbackAiAssistant();
  const draft = await ai.parseAppointmentPrompt({
    prompt: "Leblebi Ütü için bugün saat 2pm'de kontrol randevusu oluştur",
    referenceDate: '2026-11-18',
    clients: LEBLEBI,
  });
  assert.equal(draft.clientId, 'c1');
  assert.equal(draft.date, '2026-11-18');
  assert.equal(draft.startTime, '14:00');
  assert.equal(draft.endTime, '15:00');
  assert.equal(draft.note, 'için kontrol randevusu oluştur');
});

test('am/pm times: 2:30 PM, 12am and 12pm', async () => {
  const ai = new FallbackAiAssistant();
  const parse = (prompt: string) => ai.parseAppointmentPrompt({ prompt, referenceDate: '2026-11-18', clients: [] });
  assert.equal((await parse('yarın 2:30 PM Ali Veli')).startTime, '14:30');
  assert.equal((await parse('yarın 12am Ali Veli')).startTime, '00:00');
  assert.equal((await parse('yarın 12pm Ali Veli')).startTime, '12:00');
  assert.equal((await parse('yarın 9 am Ali Veli')).startTime, '09:00');
});

test("Turkish suffixes after the time leave the note (14:00'da, saat 14'te)", async () => {
  const ai = new FallbackAiAssistant();
  const a = await ai.parseAppointmentPrompt({ prompt: "Bugün saat 14:00'da Zeynep Kaya kontrol", referenceDate: '2026-11-18', clients: [] });
  assert.equal(a.note, 'kontrol');
  const b = await ai.parseAppointmentPrompt({ prompt: "Bugün saat 14'te Zeynep Kaya kontrol", referenceDate: '2026-11-18', clients: [] });
  assert.equal(b.startTime, '14:00');
  assert.equal(b.note, 'kontrol');
});

test('a new client name and the day words work with Turkish letters (Ütü, bugün, Salı)', async () => {
  const ai = new FallbackAiAssistant();
  const a = await ai.parseAppointmentPrompt({ prompt: 'Yarın 10:00 Leblebi Ütü kontrol', referenceDate: '2026-11-18', clients: [] });
  assert.deepEqual(a.suggestedClient, { firstName: 'Leblebi', lastName: 'Ütü' });
  assert.equal(a.note, 'kontrol');
  const b = await ai.parseAppointmentPrompt({ prompt: 'Salı Ali Veli kontrol', referenceDate: '2026-11-18', clients: [] });
  assert.deepEqual(b.suggestedClient, { firstName: 'Ali', lastName: 'Veli' });
  const c = await ai.parseAppointmentPrompt({ prompt: 'bugün 10:00 ali veli kontrol', referenceDate: '2026-11-18', clients: [{ id: 'c2', firstName: 'ali', lastName: 'veli' }] });
  assert.equal(c.note, 'kontrol');
});
