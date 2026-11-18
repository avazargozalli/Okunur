/**
 * Hece sayımı (Bölüm 7.7).
 *
 * Temel ilke: Türkçede her hecede tam bir ünlü vardır; hece sayısı ünlü sayısıdır.
 * Aşağıdaki kurallar bu ilkenin yetmediği durumları kapsar.
 */

import { ACRONYM_SYLLABLES, SHORT_WORDS } from "./data/acronyms.js";
import { UNITS } from "./data/units.js";
import { numberWords, ordinalExtra, wordsSyllables } from "./numbers.js";
import { countVowels, isUpperChar, lowerTr } from "./turkish.js";

/** Bir parçanın hece sonucundaki tür (Bölüm 7.7 adım 8 ve birim kuralı). */
export type SyllableKind = "word" | "number" | "mixed" | "unit";

export interface SyllableContext {
  /** Kısaltma okunuşu kuralı açık mı? (Cümlede en az bir küçük harf varsa true.) */
  acronyms?: boolean;
  /** Aynı cümlede hemen önceki kelime sayı mı? */
  prevIsNumber?: boolean;
  /** Belirteç sıra sayısı olarak işaretlendi mi? */
  ordinal?: boolean;
}

export interface SyllableResult {
  syllables: number;
  kind: SyllableKind;
}

/** `letterSyllables(seg, acronyms)` — Bölüm 7.7 tablosu. */
export function letterSyllables(segment: string, acronyms: boolean): number {
  const chars = [...segment];
  const n = chars.length;
  const lower = lowerTr(segment);
  const vowelCount = countVowels(lower);
  if (n === 1) return 1;
  if (acronyms && chars.every((char) => isUpperChar(char))) {
    const exception = ACRONYM_SYLLABLES.get(segment);
    if (exception !== undefined) return exception;
    if (vowelCount === 0) return n;
    if (n <= 3) return SHORT_WORDS.has(lower) ? vowelCount : n;
    return vowelCount;
  }
  return vowelCount > 0 ? vowelCount : n;
}

/** Kenarları temizlenmiş bir parçanın hecesi ve türü (Bölüm 7.7 adımları). */
export function pieceSyllables(piece: string, context: SyllableContext = {}): SyllableResult {
  const { acronyms = true, prevIsNumber = false, ordinal = false } = context;
  let extra = 0;
  if (piece.includes("%")) extra += 2;
  if (/[₺$€£]/u.test(piece)) extra += 2;
  const cleaned = piece.replace(/[%₺$€£&]/gu, "");
  // 2. Birim: yalnızca bir sayıdan hemen sonra geçerli.
  const unitExpansion = UNITS.get(cleaned);
  if (prevIsNumber && unitExpansion !== undefined) {
    return { syllables: extra + countVowels(unitExpansion), kind: "unit" };
  }
  const apostrophe = cleaned.indexOf("'");
  const head = apostrophe >= 0 ? cleaned.slice(0, apostrophe) : cleaned;
  const tail = apostrophe >= 0 ? cleaned.slice(apostrophe + 1) : "";
  // 5. Rakam ve harf bölütleri.
  const segments = head.match(/\d[\d.,:/]*\d|\d|\p{L}+/gu) ?? [];
  let syllables = extra;
  let previousIsNumber = false;
  let hasNumber = false;
  let hasLetter = false;
  let first = true;
  for (const segment of segments) {
    if (/^\d/.test(segment)) {
      const words = numberWords(segment);
      syllables += wordsSyllables(words);
      if (ordinal && segments.length === 1) syllables += ordinalExtra(words);
      previousIsNumber = true;
      hasNumber = true;
    } else {
      const unit = UNITS.get(segment);
      if ((previousIsNumber || (first && prevIsNumber)) && unit !== undefined) {
        syllables += countVowels(unit);
      } else {
        syllables += letterSyllables(segment, acronyms);
      }
      previousIsNumber = false;
      hasLetter = true;
    }
    first = false;
  }
  // 7. Ek (tail); alt sınır uygulanmaz.
  syllables += countVowels(tail);
  const kind: SyllableKind = hasNumber && !hasLetter ? "number" : hasNumber ? "mixed" : "word";
  return { syllables, kind };
}

export interface CountSyllablesOptions {
  /** Varsayılan: true */
  acronyms?: boolean;
  /** Varsayılan: false */
  afterNumber?: boolean;
  /** Varsayılan: false */
  ordinal?: boolean;
}

/** Tek bir kelimenin hece sayısı (Bölüm 7.7 / Bölüm 8). */
export function countSyllables(word: string, options: CountSyllablesOptions = {}): number {
  const { acronyms = true, afterNumber = false, ordinal = false } = options;
  return pieceSyllables(word, { acronyms, prevIsNumber: afterNumber, ordinal }).syllables;
}
