import type { ErrorRequestHandler } from 'express';
import { AppError } from '../domain/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'validation_error', message: 'İstek gövdesi geçerli bir JSON değil.' } });
    return;
  }
  // Express ve gövde ayrıştırıcısı istemci hatalarını 4xx koduyla bildirir (çok büyük gövde, desteklenmeyen karakter kümesi, bozuk adres).
  const status = typeof err?.status === 'number' ? err.status : err?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const message = status === 413 ? 'İstek gövdesi çok büyük.' : 'İstek geçerli değil.';
    res.status(400).json({ error: { code: 'validation_error', message } });
    return;
  }
  // Danışan bilgisi sızmasın diye hatanın yalnızca türü ve mesajı yazılır, istek gövdesi yazılmaz.
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : 'Bilinmeyen hata');
  res.status(500).json({ error: { code: 'server_error', message: 'Beklenmeyen bir hata oluştu.' } });
};
