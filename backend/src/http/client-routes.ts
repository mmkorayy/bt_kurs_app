import { Router } from 'express';
import type { SessionService } from '../auth/session-service.js';
import { parseClientInput, parseClientPatch } from '../domain/validation.js';
import type { ClientService } from '../services/client-service.js';
import { requireAuth } from './auth-middleware.js';

export function todayLocal(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function createClientRouter(sessions: SessionService, clients: ClientService): Router {
  const router = Router();
  router.use(requireAuth(sessions));

  router.get('/', async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json({ clients: await clients.search(req.user!.id, search) });
  });

  router.post('/', async (req, res) => {
    const input = parseClientInput(req.body, todayLocal());
    res.status(201).json({ client: await clients.create(req.user!.id, input) });
  });

  router.get('/:id', async (req, res) => {
    res.json({ client: await clients.get(req.user!.id, req.params.id) });
  });

  router.patch('/:id', async (req, res) => {
    const patch = parseClientPatch(req.body, todayLocal());
    res.json({ client: await clients.update(req.user!.id, req.params.id, patch) });
  });

  router.delete('/:id', async (req, res) => {
    await clients.softDelete(req.user!.id, req.params.id);
    res.status(204).end();
  });

  return router;
}
