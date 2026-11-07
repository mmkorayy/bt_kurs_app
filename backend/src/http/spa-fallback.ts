import fs from 'node:fs';
import path from 'node:path';
import type express from 'express';

/**
 * Tarayıcı tarafı rotalar (örn. /panel/hafta) doğrudan açılınca ya da yenilenince
 * index.html döndürür. /api ve /docs ile dosya uzantılı yollar (eksik varlıklar) hariçtir.
 * Ön yüz henüz derlenmemişse (index.html yok) istek sade bir 404 olur.
 */
export function createSpaFallback(staticDir: string): express.RequestHandler {
  const indexFile = path.join(staticDir, 'index.html');
  return (req, res, next) => {
    const isRead = req.method === 'GET' || req.method === 'HEAD';
    // Yalnızca tam /api ve /docs bölümleri ayrılmıştır; /apiary gibi yollar tarayıcı rotası olabilir.
    const reserved = ['/api', '/docs'].some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
    if (!isRead || reserved || path.extname(req.path) !== '') return next();
    if (!fs.existsSync(indexFile)) return next();
    res.sendFile(indexFile);
  };
}
