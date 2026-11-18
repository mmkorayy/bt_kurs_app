import type pg from 'pg';
import { GeminiAiAssistant } from './ai/gemini-ai-assistant.js';
import type { AppDeps } from './app.js';
import { DEMO_USERS, DemoIdentityProvider } from './auth/demo-identity-provider.js';
import type { IdentityProvider } from './auth/identity-provider.js';
import { SessionService } from './auth/session-service.js';
import { loadConfig, type Config } from './config.js';
import { createPool } from './db/pool.js';
import { upsertUsers } from './db/users.js';
import { MemoryAppointmentRepository } from './repositories/memory/appointment-repository.js';
import { MemoryClientRepository } from './repositories/memory/client-repository.js';
import { MemoryReminderNotificationRepository } from './repositories/memory/reminder-notification-repository.js';
import { MemorySessionStore } from './repositories/memory/session-store.js';
import { MemoryUserRepository } from './repositories/memory/user-repository.js';
import { PostgresAppointmentRepository } from './repositories/postgres/appointment-repository.js';
import { PostgresClientRepository } from './repositories/postgres/client-repository.js';
import { PostgresReminderNotificationRepository } from './repositories/postgres/reminder-notification-repository.js';
import { PostgresSessionStore } from './repositories/postgres/session-store.js';
import { PostgresUserRepository } from './repositories/postgres/user-repository.js';
import type {
  AppointmentRepository,
  ClientRepository,
  ReminderNotificationRepository,
  SessionStore,
  UserRepository,
} from './repositories/types.js';
import { AppointmentService } from './services/appointment-service.js';
import { ClientService } from './services/client-service.js';
import { ConsoleEmailSender } from './services/email-sender.js';
import { ReminderService } from './services/reminder-service.js';

/** Demo hesaplar kapalıyken hiç kimse giriş yapamaz. */
const noIdentityProvider: IdentityProvider = {
  authenticate: async () => undefined,
  findUser: async () => undefined,
};

function assemble(
  config: Config,
  repos: {
    users: UserRepository;
    clients: ClientRepository;
    appointments: AppointmentRepository;
    sessionStore: SessionStore;
    notifications: ReminderNotificationRepository;
  },
): AppDeps {
  const provider = config.demoAccountsEnabled ? new DemoIdentityProvider() : noIdentityProvider;
  const ai = new GeminiAiAssistant(config.geminiApiKey, config.geminiModel);
  const emailSender = new ConsoleEmailSender();
  const reminders = new ReminderService(
    repos.users,
    repos.appointments,
    repos.clients,
    repos.notifications,
    ai,
    emailSender,
  );

  return {
    sessions: new SessionService(provider, repos.sessionStore),
    clients: new ClientService(repos.clients),
    appointments: new AppointmentService(repos.appointments, repos.clients),
    ai,
    reminders,
    production: config.production,
  };
}

/** Postgres depoları: demo hesaplar açıksa demo kullanıcılar `users`'a eklenir (production'da kapalıyken eklenmez). */
export async function buildPostgresDeps(pool: pg.Pool, config: Config): Promise<AppDeps> {
  if (config.demoAccountsEnabled) await upsertUsers(pool, DEMO_USERS);
  return assemble(config, {
    users: new PostgresUserRepository(pool),
    clients: new PostgresClientRepository(pool),
    appointments: new PostgresAppointmentRepository(pool),
    sessionStore: new PostgresSessionStore(pool),
    notifications: new PostgresReminderNotificationRepository(pool),
  });
}

function unreachableMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  const hint = text.includes('insecure') ? ' Adres `?sslmode=verify-full` ile bitmeli.' : '';
  // Hata metni adresi ya da parolayı içerebilir; bu yüzden asıl mesaj sabittir.
  return `Veritabanına bağlanılamadı. DATABASE_URL adresini ve ağ bağlantısını kontrol edin.${hint}`;
}

/**
 * `DATABASE_URL` varsa veriler Postgres'te, yoksa bellekte tutulur. Adres tanımlı ama ulaşılamıyorsa
 * sessizce belleğe düşmez: açıklayıcı bir hatayla (adres içermeyen) reddeder.
 */
export async function buildDeps(env: NodeJS.ProcessEnv): Promise<AppDeps> {
  const config = loadConfig(env);
  if (!config.databaseUrl) {
    const clients = new MemoryClientRepository();
    return assemble(config, {
      users: new MemoryUserRepository(DEMO_USERS),
      clients,
      appointments: new MemoryAppointmentRepository(),
      sessionStore: new MemorySessionStore(),
      notifications: new MemoryReminderNotificationRepository(),
    });
  }

  const pool = createPool(config.databaseUrl);
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    await pool.end().catch(() => {});
    throw new Error(unreachableMessage(error));
  }
  try {
    return await buildPostgresDeps(pool, config);
  } catch {
    await pool.end().catch(() => {});
    throw new Error('Veritabanı hazırlanamadı. Şema uygulanmış mı? `npm run db:migrate` komutunu çalıştırın.');
  }
}
