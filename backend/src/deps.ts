import type { AppDeps } from './app.js';
import { DemoIdentityProvider } from './auth/demo-identity-provider.js';
import type { IdentityProvider } from './auth/identity-provider.js';
import { SessionService } from './auth/session-service.js';
import { loadConfig } from './config.js';
import { MemoryAppointmentRepository } from './repositories/memory/appointment-repository.js';
import { MemoryClientRepository } from './repositories/memory/client-repository.js';
import { MemorySessionStore } from './repositories/memory/session-store.js';
import { AppointmentService } from './services/appointment-service.js';
import { ClientService } from './services/client-service.js';

/** Demo hesaplar kapalıyken hiç kimse giriş yapamaz. */
const noIdentityProvider: IdentityProvider = {
  authenticate: async () => undefined,
  findUser: async () => undefined,
};

export function buildDeps(env: NodeJS.ProcessEnv): AppDeps {
  const config = loadConfig(env);
  const clientRepo = new MemoryClientRepository();
  const provider = config.demoAccountsEnabled ? new DemoIdentityProvider() : noIdentityProvider;
  return {
    sessions: new SessionService(provider, new MemorySessionStore()),
    clients: new ClientService(clientRepo),
    appointments: new AppointmentService(new MemoryAppointmentRepository(), clientRepo),
    production: config.production,
  };
}
