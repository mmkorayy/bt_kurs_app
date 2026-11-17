import type { AddressInfo } from 'node:net';
import { FallbackAiAssistant } from './ai/fallback-ai-assistant.js';
import { createApp, type AppDeps } from './app.js';
import { DEMO_USERS, DemoIdentityProvider } from './auth/demo-identity-provider.js';
import { SessionService } from './auth/session-service.js';
import { MemoryAppointmentRepository } from './repositories/memory/appointment-repository.js';
import { MemoryClientRepository } from './repositories/memory/client-repository.js';
import { MemoryReminderNotificationRepository } from './repositories/memory/reminder-notification-repository.js';
import { MemorySessionStore } from './repositories/memory/session-store.js';
import { MemoryUserRepository } from './repositories/memory/user-repository.js';
import { AppointmentService } from './services/appointment-service.js';
import { ClientService } from './services/client-service.js';
import type { EmailSender } from './services/email-sender.js';
import { ReminderService } from './services/reminder-service.js';

/** Testlerde e-posta yazdırılmaz. */
const silentEmailSender: EmailSender = { async send() {} };

export const ELIF = { email: 'elif@bookpal.demo', password: 'demo-elif-123' };
export const MERT = { email: 'mert@bookpal.demo', password: 'demo-mert-123' };

export function buildTestDeps(over: Partial<AppDeps> = {}, now?: () => Date): AppDeps {
  const clientRepo = new MemoryClientRepository();
  const appointmentRepo = new MemoryAppointmentRepository();
  const ai = new FallbackAiAssistant();
  return {
    sessions: new SessionService(new DemoIdentityProvider(), new MemorySessionStore()),
    clients: new ClientService(clientRepo),
    appointments: new AppointmentService(appointmentRepo, clientRepo),
    ai,
    reminders: new ReminderService(
      new MemoryUserRepository(DEMO_USERS),
      appointmentRepo,
      clientRepo,
      new MemoryReminderNotificationRepository(),
      ai,
      silentEmailSender,
      now,
    ),
    production: false,
    ...over,
  };
}

export interface TestServer {
  baseUrl: string;
  close(): void;
  /** Giriş yapar ve o kullanıcı adına istek atan bir fetch sarmalayıcısı döndürür. */
  login(credentials: { email: string; password: string }): Promise<{
    token: string;
    api(path: string, init?: { method?: string; body?: unknown }): Promise<Response>;
  }>;
}

export function startTestServer(deps: AppDeps = buildTestDeps()): TestServer {
  const server = createApp(deps).listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    baseUrl,
    close: () => server.close(),
    async login(credentials) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const { token } = (await res.json()) as { token: string };
      return {
        token,
        api: (path, init = {}) =>
          fetch(`${baseUrl}/api/v1${path}`, {
            method: init.method ?? 'GET',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: init.body === undefined ? undefined : JSON.stringify(init.body),
          }),
      };
    },
  };
}
