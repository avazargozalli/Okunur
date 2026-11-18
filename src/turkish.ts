/**
 * Türkçeye özgü harf işlemleri (Bölüm 7.3).
 *
 * Not: `toLocaleLowerCase('tr')` bilinçli olarak kullanılmaz; ortamın ICU verisine
 * bağlı olduğu için `lowerTr` tek doğruluk kaynağıdır (Bölüm 5).
 */

/** Ünlüler (küçük harf). */
const VOWELS: ReadonlySet<string> = new Set([..."aeıioöuüâîûêôáàäãåéèëíìïóòõúù"]);

/** `İ` → `i`, `I` → `ı`, sonra küçük harfe çevir. */
export function lowerTr(value: string): string {
  return value.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

/** Tek karakter büyük harf mi (`\p{Lu}`)? */
export function isUpperChar(char: string): boolean {
  return /\p{Lu}/u.test(char);
}

/** Tek karakter küçük harf mi (`\p{Ll}`)? */
export function isLowerChar(char: string): boolean {
  return /\p{Ll}/u.test(char);
}

/** Karakter ünlü mü (küçük harf kümesine göre)? */
export function isVowel(char: string): boolean {
  return VOWELS.has(char);
}

/** `lowerTr(value)` içindeki ünlü sayısı. */
export function countVowels(value: string): number {
  let total = 0;
  for (const char of lowerTr(value)) {
    if (VOWELS.has(char)) total += 1;
  }
  return total;
}

/** Belirteçteki ilk harf-ya-da-rakam karakteri (yoksa boş dize). */
export function firstAlnum(value: string): string {
  for (const char of value) {
    if (/[\p{L}\p{N}]/u.test(char)) return char;
  }
  return "";
}

/** Belirteçteki ilk harf-ya-da-rakam karakteri büyük harf mi? (Rakamsa yanlış.) */
export function startsUpper(value: string): boolean {
  return isUpperChar(firstAlnum(value) || "x");
}

/** Belirteçteki ilk harf-ya-da-rakam karakteri küçük harf mi? (Rakamsa yanlış.) */
export function startsLower(value: string): boolean {
  return isLowerChar(firstAlnum(value) || "X");
}

/** Sade karşılık karşılaştırması için sadeleştirme (Bölüm 7.11.3). */
export function fold(value: string): string {
  return lowerTr(value).replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u");
}
