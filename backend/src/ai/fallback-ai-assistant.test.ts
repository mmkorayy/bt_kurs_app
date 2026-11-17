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
