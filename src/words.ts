/**
 * Kelimeler (Bölüm 7.6).
 *
 * Kenar temizliği, e-posta/URL atlama, kısaltmalar, parçalara bölme ve hece sayımı.
 * `stripEdges` ve `findAbbreviation` cümle sınırı kuralında da (7.5) kullanılır.
 */

import type { Abbreviation } from "./data/abbreviations.js";
import { ABBREVIATIONS } from "./data/abbreviations.js";
import { cardinal, ordinalExtra, romanToNumber, wordsSyllables } from "./numbers.js";
import type { RawToken } from "./sentences.js";
import { pieceSyllables } from "./syllables.js";
import { countVowels, isUpperChar, lowerTr } from "./turkish.js";
import type { Word, WordKind } from "./types.js";

/** Atlanan e-posta ve URL sayıları. */
export interface IgnoredCounts {
  urls: number;
  emails: number;
}

/** Kenar temizliğinde korunan karakterler. */
const EDGE_KEEP = /[\p{L}\p{N}%₺$€£&]/u;

/**
 * Baştan ve sondan, kelime kenarı sayılmayan karakterleri atar (Bölüm 7.6 adım 1).
 * `keepDots` doğruysa sondaki noktalar şimdilik korunur.
 */
export function stripEdges(value: string, keepDots = false): { text: string; offset: number } {
  let start = 0;
  let end = value.length;
  while (start < end && !EDGE_KEEP.test(value.charAt(start))) start += 1;
  while (
    end > start &&
    !EDGE_KEEP.test(value.charAt(end - 1)) &&
    !(keepDots && value.charAt(end - 1) === ".")
  ) {
    end -= 1;
  }
  return { text: value.slice(start, end), offset: start };
}

/**
 * Sonunda nokta bulunan bir gövdeden kısaltma kaydı bulur (Bölüm 7.5 S8, 7.6 adım 4).
 * `core` sondaki noktaları korunmuş halidir.
 */
export function findAbbreviation(core: string): Abbreviation | null {
  const noDots = core.replace(/\.+$/, "");
  if (noDots === core) return null;
  const abbreviation = ABBREVIATIONS.get(`${lowerTr(noDots)}.`);
  if (abbreviation && (!abbreviation.onlyCapitalized || isUpperChar(noDots.charAt(0)))) {
    return abbreviation;
  }
  return null;
}

const URL_RE =
  /^(?:https?:\/\/|www\.)\S+$|^[\w-]+(?:\.[\w-]+)*\.(?:com|org|net|edu|gov|tr|io|co|info|dev|app)(?:\/\S*)?$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROMAN_ORDINAL_RE = /^[IVX]{2,}$/;
const INITIALS_RE = /^(\p{L}\.)+\p{L}?$/u;
const LETTERS_OR_NUMBERS_RE = /[\p{L}\p{N}]/u;
const LETTER_RE = /\p{L}/u;
const SEPARATOR_RE = /[–—]|\//g;
const SLASH_RE = /[–—/]/;

/** Bir cümlenin belirteçlerinden kelimeleri çıkarır (Bölüm 7.6). */
export function extractWords(
  tokens: readonly RawToken[],
  sentenceText: string,
  ignored: IgnoredCounts,
): Word[] {
  const acronyms = /\p{Ll}/u.test(sentenceText);
  const words: Word[] = [];
  let prevIsNumber = false;
  for (const token of tokens) {
    const { text: core, offset } = stripEdges(token.text, true);
    const noDots = core.replace(/\.+$/, "");
    if (!noDots) continue;
    if (EMAIL_RE.test(noDots)) {
      ignored.emails += 1;
      prevIsNumber = false;
      continue;
    }
    if (URL_RE.test(noDots)) {
      ignored.urls += 1;
      prevIsNumber = false;
      continue;
    }
    const base = token.start + offset;
    // Kısaltma (kesme ekiyle birlikte olabilir).
    const apostrophe = core.indexOf("'");
    const headRaw = apostrophe >= 0 ? core.slice(0, apostrophe) : core;
    const tailRaw = apostrophe >= 0 ? core.slice(apostrophe + 1).replace(/\.+$/, "") : "";
    const abbreviation = findAbbreviation(headRaw);
    if (abbreviation) {
      words.push({
        text: noDots,
        start: base,
        end: base + noDots.length,
        syllables: countVowels(abbreviation.expansion) + countVowels(tailRaw),
        kind: "abbr",
      });
      prevIsNumber = false;
      continue;
    }
    // Noktalı baş harfler (A.B.D, T.C.).
    const headDotsRemoved = headRaw.replace(/\.+$/, "");
    const headLetters = [...headDotsRemoved.replace(/\./g, "")];
    if (INITIALS_RE.test(headRaw) && headLetters.length >= 2) {
      words.push({
        text: noDots,
        start: base,
        end: base + noDots.length,
        syllables: headLetters.length + countVowels(tailRaw),
        kind: "abbr",
      });
      prevIsNumber = false;
      continue;
    }
    // Parçalara bölme: – ve — her zaman; / yalnızca iki yanında da harf varsa.
    const parts: Array<[number, number]> = [];
    let last = 0;
    SEPARATOR_RE.lastIndex = 0;
    let separator = SEPARATOR_RE.exec(noDots);
    while (separator !== null) {
      if (separator[0] === "/") {
        const left = noDots.slice(last, separator.index);
        const right = noDots.slice(separator.index + 1).split(SLASH_RE)[0] as string;
        if (!(LETTER_RE.test(left) && LETTER_RE.test(right))) {
          separator = SEPARATOR_RE.exec(noDots);
          continue;
        }
      }
      parts.push([last, separator.index]);
      last = separator.index + 1;
      separator = SEPARATOR_RE.exec(noDots);
    }
    parts.push([last, noDots.length]);
    for (const [partStart, partEnd] of parts) {
      const { text: piece, offset: pieceOffset } = stripEdges(noDots.slice(partStart, partEnd));
      if (!piece) continue;
      if (piece === "&") {
        words.push({
          text: piece,
          start: base + partStart + pieceOffset,
          end: base + partStart + pieceOffset + 1,
          syllables: 1,
          kind: "symbol",
        });
        prevIsNumber = false;
        continue;
      }
      if (!LETTERS_OR_NUMBERS_RE.test(piece)) continue;
      let result: { syllables: number; kind: WordKind };
      if (token.ordinal && ROMAN_ORDINAL_RE.test(piece)) {
        const numberWordsResult = cardinal(romanToNumber(piece));
        result = {
          syllables: wordsSyllables(numberWordsResult) + ordinalExtra(numberWordsResult),
          kind: "number",
        };
      } else {
        result = pieceSyllables(piece, { acronyms, prevIsNumber, ordinal: token.ordinal });
      }
      words.push({
        text: piece,
        start: base + partStart + pieceOffset,
        end: base + partStart + pieceOffset + piece.length,
        syllables: result.syllables,
        kind: result.kind,
      });
      prevIsNumber = result.kind === "number";
    }
  }
  return words;
}
