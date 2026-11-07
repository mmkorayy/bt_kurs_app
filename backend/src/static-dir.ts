import fs from 'node:fs';
import path from 'node:path';

/**
 * Sunulacak klasör: derlenmiş ön yüz (frontend/dist) varsa o, yoksa eski tanıtım sayfası (web).
 * 2. görevde web/ kalkınca yalnızca frontend/dist kalır.
 */
export function resolveStaticDir(repoRoot: string): string {
  const dist = path.join(repoRoot, 'frontend', 'dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) return dist;
  return path.join(repoRoot, 'web');
}
