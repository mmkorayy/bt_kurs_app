import pg from 'pg';

const DATE_OID = 1082;
const TIME_OID = 1083;

/**
 * `date` ve `time` sütunları düz metin döner: `'YYYY-MM-DD'` ve `'HH:MM'`.
 * Aksi halde `pg` `date`'i yerel saatte `Date`'e çevirir ve gün kayar.
 * Çözücüler yalnızca bu havuza verilir; `pg.types` global durumu değişmez.
 */
const types = {
  getTypeParser(oid: number, format?: 'text' | 'binary') {
    if (oid === DATE_OID) return (value: string) => value;
    if (oid === TIME_OID) return (value: string) => value.slice(0, 5);
    return pg.types.getTypeParser(oid, format as 'text');
  },
} as pg.CustomTypesConfig;

export function createPool(databaseUrl: string, options: pg.PoolConfig = {}): pg.Pool {
  const pool = new pg.Pool({ ...options, connectionString: databaseUrl, types });
  // Neon boştaki bağlantıları kapatır; dinleyici yoksa bu 'error' olayı Node sürecini çökertir.
  // Havuz bir sonraki istekte yeni bağlantı açar. Mesaj adres içermez.
  pool.on('error', (error) => {
    console.error('Veritabanı bağlantısı koptu, yenisi açılacak:', error.message);
  });
  return pool;
}
