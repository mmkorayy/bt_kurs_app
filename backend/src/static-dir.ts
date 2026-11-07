import path from 'node:path';

/** Sunulacak klasör: derlenmiş ön yüz (`frontend/dist`). Önce `cd frontend && npm run build` gerekir. */
export function resolveStaticDir(repoRoot: string): string {
  return path.join(repoRoot, 'frontend', 'dist');
}
