import express from 'express';
import type { SessionService } from './auth/session-service.js';
import { notFound } from './domain/errors.js';
import { createAppointmentRouter } from './http/appointment-routes.js';
import { createAuthRouter } from './http/auth-routes.js';
import { createClientRouter } from './http/client-routes.js';
import { errorHandler } from './http/error-handler.js';
import type { AppointmentService } from './services/appointment-service.js';
import type { ClientService } from './services/client-service.js';

export interface AppDeps {
  sessions: SessionService;
  clients: ClientService;
  appointments: AppointmentService;
  production: boolean;
  staticDir?: string;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/v1/auth', createAuthRouter(deps.sessions, deps.production));
  app.use('/api/v1/clients', createClientRouter(deps.sessions, deps.clients));
  app.use('/api/v1/appointments', createAppointmentRouter(deps.sessions, deps.appointments));

  app.use('/api', (_req, _res, next) => next(notFound('Adres bulunamadı.')));
  if (deps.staticDir) app.use(express.static(deps.staticDir));
  app.use(errorHandler);
  return app;
}
