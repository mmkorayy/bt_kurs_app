import { Router } from 'express';
import { validationError } from '../domain/errors.js';
import type { ReminderMinutes } from '../domain/types.js';
import type { AppDeps } from '../app.js';
import { requireAuth } from './auth-middleware.js';

const VALID_MINUTES: Array<ReminderMinutes | null> = [15, 30, 60, null];

export function createReminderRoutes(deps: AppDeps): Router {
  const router = Router();
  const auth = requireAuth(deps.sessions);

  router.get('/settings/reminders', auth, async (req, res, next) => {
    try {
      const settings = await deps.reminders.getSettings(req.user!.id);
      res.status(200).json(settings);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/settings/reminders', auth, async (req, res, next) => {
    try {
      const val = req.body?.reminderMinutesBefore;
      if (val !== null && val !== 15 && val !== 30 && val !== 60) {
        throw validationError('Geçersiz bildirim süresi. (15, 30, 60 veya null olmalıdır)');
      }
      const updated = await deps.reminders.updateSettings(req.user!.id, val);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.post('/reminders/check', auth, async (req, res, next) => {
    try {
      const result = await deps.reminders.checkUserReminders(req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/reminders/sent', auth, async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const list = await deps.reminders.listSent(req.user!.id, limit);
      res.status(200).json({ notifications: list });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
