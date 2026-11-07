import { useEffect } from 'react';

const SITE_NAME = 'Bookpal';

/** Sekme başlığını "<başlık> · Bookpal" yapar; sayfa kapanınca düz "Bookpal"a döner. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · ${SITE_NAME}`;
    return () => {
      document.title = SITE_NAME;
    };
  }, [title]);
}
