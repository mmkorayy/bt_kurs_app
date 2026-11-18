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

test('when Gemini refuses, the reason goes to the log (status and model, never the key) and the parser still answers', async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const logged: string[] = [];
  try {
    console.warn = (...args: unknown[]) => void logged.push(args.join(' '));
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', message: 'models/old-model is not found (key SECRET-KEY-123)' } }),
        { status: 404 },
      );

    const assistant = new GeminiAiAssistant('SECRET-KEY-123', 'old-model');
    const draft = await assistant.parseAppointmentPrompt({
      prompt: 'Yarın 15:00 Ali Veli görüşme',
      referenceDate: '2026-11-17',
      clients: [{ id: 'c1', firstName: 'Ali', lastName: 'Veli' }],
    });
    assert.equal(draft.startTime, '15:00');

    const summary = await assistant.summarizeClientHistory({
      clientName: 'Ali Veli',
      upcomingAppointment: { date: '2026-11-18', startTime: '15:00', note: '' },
      pastAppointments: [],
    });
    assert.match(summary, /kayıtlı seans bulunmuyor/);

    assert.equal(logged.length, 2);
    for (const line of logged) {
      assert.match(line, /Gemini/);
      assert.match(line, /404/);
      assert.match(line, /NOT_FOUND/);
      assert.match(line, /old-model/);
      assert.ok(!line.includes('SECRET-KEY-123'));
    }
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});

test('a network error or timeout is logged too, without the key', async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const logged: string[] = [];
  try {
    console.warn = (...args: unknown[]) => void logged.push(args.join(' '));
    globalThis.fetch = async () => {
      throw new Error('connect failed for key SECRET-KEY-123');
    };
    const assistant = new GeminiAiAssistant('SECRET-KEY-123');
    await assistant.parseAppointmentPrompt({ prompt: 'Yarın 15:00 Ali Veli', referenceDate: '2026-11-17', clients: [] });
    assert.equal(logged.length, 1);
    assert.match(logged[0], /Gemini/);
    assert.match(logged[0], /connect failed/);
    assert.ok(!logged[0].includes('SECRET-KEY-123'));
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});

test('without GEMINI_MODEL the request goes to gemini-3.1-flash-lite (gemini-2.5-flash is retired for new keys)', async () => {
  const originalFetch = globalThis.fetch;
  let url = '';
  try {
    globalThis.fetch = async (input: string | URL | Request) => {
      url = String(input);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"date":"2026-11-19","startTime":"14:00","endTime":"15:00"}' }] } }] }), { status: 200 });
    };
    await new GeminiAiAssistant('test-key').parseAppointmentPrompt({ prompt: 'x', referenceDate: '2026-11-18', clients: [] });
    assert.match(url, /models\/gemini-3\.1-flash-lite:generateContent/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
