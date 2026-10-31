/** Büyük/küçük harf, aksan ve Türkçe noktalı/noktasız i farkını yok sayar. */
export function foldForSearch(s: string): string {
  return s
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
