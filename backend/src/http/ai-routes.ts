import { Router } from 'express';
import { validationError } from '../domain/errors.js';
import type { AppDeps } from '../app.js';
import { isRealDate, sanitizeDraft } from '../ai/draft-validation.js';
import { istanbulParts } from '../services/istanbul-time.js';
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

      const requested = req.body?.referenceDate;
      if (requested !== undefined && (typeof requested !== 'string' || !isRealDate(requested))) {
        throw validationError('Referans tarih YYYY-AA-GG biçiminde gerçek bir tarih olmalıdır.');
      }
      const referenceDate = requested ?? istanbulParts(new Date()).date;

      const clients = await deps.clients.search(req.user!.id);
      const rawDraft = await deps.ai.parseAppointmentPrompt({
        prompt,
        referenceDate,
        clients: clients.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
      });

      const draft = sanitizeDraft(rawDraft, { referenceDate, clientIds: clients.map((c) => c.id) });
      res.status(200).json({ draft });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
