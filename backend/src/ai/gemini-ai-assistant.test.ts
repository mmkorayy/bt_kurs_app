import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiAiAssistant } from './gemini-ai-assistant.js';

test('GeminiAiAssistant falls back to local parser when apiKey is missing', async () => {
  const assistant = new GeminiAiAssistant(undefined);
  const clients = [{ id: 'c1', firstName: 'Elif', lastName: 'Yıldız' }];

  const draft = await assistant.parseAppointmentPrompt({
    prompt: 'Yarın 10:00 Elif Yıldız seans',
    referenceDate: '2026-11-17',
    clients,
  });

  assert.equal(draft.clientId, 'c1');
  assert.equal(draft.date, '2026-11-18');
  assert.equal(draft.startTime, '10:00');
  assert.equal(draft.endTime, '11:00');
});

test('GeminiAiAssistant parses structured JSON response from Gemini API', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      clientId: 'c2',
                      suggestedClient: null,
                      date: '2026-11-19',
                      startTime: '14:30',
                      endTime: '15:30',
                      note: 'Online terapi',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );

    const assistant = new GeminiAiAssistant('test-key', 'gemini-2.5-flash');
    const draft = await assistant.parseAppointmentPrompt({
      prompt: 'Perşembe 14:30 online terapi',
      referenceDate: '2026-11-17',
      clients: [{ id: 'c2', firstName: 'Mert', lastName: 'Aydın' }],
    });

    assert.equal(draft.clientId, 'c2');
    assert.equal(draft.date, '2026-11-19');
    assert.equal(draft.startTime, '14:30');
    assert.equal(draft.endTime, '15:30');
    assert.equal(draft.note, 'Online terapi');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GeminiAiAssistant falls back gracefully when API returns error', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('Server Error', { status: 500 });

    const assistant = new GeminiAiAssistant('test-key');
    const draft = await assistant.parseAppointmentPrompt({
      prompt: 'Yarın 15:00 Ali Veli görüşme',
      referenceDate: '2026-11-17',
      clients: [{ id: 'c1', firstName: 'Ali', lastName: 'Veli' }],
    });

    assert.equal(draft.clientId, 'c1');
    assert.equal(draft.date, '2026-11-18');
    assert.equal(draft.startTime, '15:00');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
