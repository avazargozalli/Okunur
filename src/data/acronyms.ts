/**
 * Kısaltma adı istisnaları (Bölüm 7.9.2) ve kısa sözcükler (Bölüm 7.9.3).
 *
 * Hece sütunu doğrulama içindir; kodda kısaltma adları yalnızca bu tablodan okunur.
 */

/** Okunuşu kurala uymayan kısaltma adları: yazılış → hece. */
export const ACRONYM_SYLLABLES: ReadonlyMap<string, number> = new Map<string, number>([
  ["YÖK", 1],
  ["MEB", 1],
  ["MİT", 1],
  ["PIN", 1],
  ["ÖSYM", 4],
  ["AİHM", 4],
  ["İETT", 4],
  ["ODTÜ", 4],
]);

/** Büyük harfle yazılsa da kısaltma sayılmayan kısa sözcükler (küçük harf). */
export const SHORT_WORDS: ReadonlySet<string> = new Set(
  "ve bu şu o en çok hiç her bir iki üç de da ki mi mı mu mü ne ya ile var yok tam son ilk not dur gel git bak al ver yap et ol ama az biz siz ben sen tek hem bin on yüz iyi".split(
    " ",
  ),
);
