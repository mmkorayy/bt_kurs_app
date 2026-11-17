import { Router } from 'express';
import { validationError } from '../domain/errors.js';
import type { AppDeps } from '../app.js';
import { requireAuth } from './auth-middleware.js';

export function createAiRoutes(deps: AppDeps): Router {
  const router = Router();
  router.use(requireAuth(deps.sessions));

  router.post('/parse-appointment', async (req, res, next) => {
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      if (!prompt) {
        throw validationError('Komut boş olamaz.');
      }

      const referenceDate =
        typeof req.body?.referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.referenceDate)
          ? req.body.referenceDate
          : new Date().toISOString().slice(0, 10);

      const clients = await deps.clients.search(req.user!.id);
      const draft = await deps.ai.parseAppointmentPrompt({
        prompt,
        referenceDate,
        clients: clients.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
      });

      res.status(200).json({ draft });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
