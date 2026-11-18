/**
 * Bloklar ve cümle sınırı (Bölüm 7.4, 7.5).
 *
 * Her blok bir cümle sınırıdır; blok sonunda noktalama olmasa da cümle biter.
 * Cümle sınırı kuralları S1–S15 sırasıyla uygulanır.
 */

import { startsLower, startsUpper } from "./turkish.js";
import { findAbbreviation, stripEdges } from "./words.js";

/** Bir belirteç ve normalize metindeki başlangıcı. */
export interface TokenPosition {
  text: string;
  start: number;
}

/** Cümleye ait belirteç; sıra sayısı işareti burada taşınır. */
export interface RawToken extends TokenPosition {
  ordinal?: boolean;
}

/** Henüz hecelenmemiş cümle. */
export interface RawSentence {
  start: number;
  end: number;
  tokens: RawToken[];
}

/** Cümle sınırı sonucu: belirteç cümleyi bitirir mi, sıra sayısı mı? */
export interface BoundaryResult {
  end: boolean;
  ordinal: boolean;
}

/** Blok başındaki liste/başlık işaretleri (Bölüm 7.4); tekrar tekrar atlanır. */
const BLOCK_MARKER =
  /^\s*(?:#{1,6}\s+|>\s+|[-*•–—]\s+|\d{1,3}\)\s+|\d{1,3}\.\s+(?!\p{Ll})|\p{L}\)\s+)/u;
const TOKEN_RE = /\S+/g;
const TERMINATOR_RE = /([.!?]+)(["'”’»)\]}]*)$/u;
const QUOTE_CLOSER_RE = /["'”’»]/u;
const INITIALS_RE = /^(\p{L}\.)+\p{L}$/u;
const SINGLE_LETTER_RE = /^\p{L}$/u;
const ROMAN_RE = /^[IVX]{2,}$/;
const NUMERIC_RE = /^\d[\d.,:/]*$/;
const SMALL_INTEGER_RE = /^\d{1,2}$/;

/** S1–S15: belirteç cümleyi bitirir mi? `next` aynı bloktaki sonraki belirteçtir. */
export function sentenceBoundary(token: string, next: string | null): BoundaryResult {
  const match = token.match(TERMINATOR_RE);
  if (!match) return { end: next === null, ordinal: false };
  const run = match[1] as string;
  const closers = match[2] as string;
  const before = token.slice(0, match.index as number);
  if (next === null) return { end: true, ordinal: false };
  // S3: kapanış tırnağından sonra küçük harf geliyorsa cümle bitmez.
  if (QUOTE_CLOSER_RE.test(closers) && startsLower(next)) return { end: false, ordinal: false };
  if (/[!?]/.test(run)) {
    // S4: (!) ve (?) kalıpları cümle bitirmez.
    if (before.endsWith("(") && closers.startsWith(")")) return { end: false, ordinal: false };
    return { end: true, ordinal: false };
  }
  // S6: üç nokta; sonraki belirteç büyük harfle başlıyorsa bitirir.
  if (run.length >= 2) return { end: startsUpper(next), ordinal: false };
  const body = stripEdges(before).text;
  if (body === "") return { end: true, ordinal: false };
  // S8: kısaltma tablosu.
  const abbreviation = findAbbreviation(`${body}.`);
  if (abbreviation) {
    return { end: abbreviation.boundary === "son" ? startsUpper(next) : false, ordinal: false };
  }
  // S9: noktalı baş harf dizisi.
  if (INITIALS_RE.test(body)) return { end: false, ordinal: false };
  // S10: tek harf.
  if (SINGLE_LETTER_RE.test(body)) return { end: false, ordinal: false };
  // S11: Romen rakamı → sıra sayısı.
  if (ROMAN_RE.test(body)) return { end: false, ordinal: true };
  if (NUMERIC_RE.test(body)) {
    // S12: 1–2 basamaklı tam sayı → sıra sayısı.
    if (SMALL_INTEGER_RE.test(body)) return { end: false, ordinal: true };
    // S13: sonraki belirteç küçük harfle başlıyorsa sıra sayısı.
    if (startsLower(next)) return { end: false, ordinal: true };
    return { end: true, ordinal: false };
  }
  return { end: true, ordinal: false };
}

/**
 * Metni bloklara (boş olmayan satırlara) ve cümlelere böler (Bölüm 7.4, 7.5).
 * `paragraphs` blok sayısıdır.
 */
export function splitSentences(text: string): { sentences: RawSentence[]; paragraphs: number } {
  const sentences: RawSentence[] = [];
  let paragraphs = 0;
  let position = 0;
  for (const line of text.split("\n")) {
    const lineStart = position;
    position += line.length + 1;
    if (!line.trim()) continue;
    paragraphs += 1;
    let skip = 0;
    for (;;) {
      const marker = line.slice(skip).match(BLOCK_MARKER);
      if (!marker) break;
      skip += marker[0].length;
    }
    const tokens: TokenPosition[] = [...line.slice(skip).matchAll(TOKEN_RE)].map((match) => ({
      text: match[0],
      start: lineStart + skip + (match.index as number),
    }));
    let current: RawSentence | null = null;
    for (const [index, token] of tokens.entries()) {
      const next = tokens[index + 1];
      if (!current) current = { start: token.start, end: 0, tokens: [] };
      const boundary = sentenceBoundary(token.text, next?.text ?? null);
      current.tokens.push({ ...token, ordinal: boundary.ordinal });
      if (boundary.end) {
        current.end = token.start + token.text.length;
        sentences.push(current);
        current = null;
      }
    }
    // Blok sonundaki belirteç her zaman cümleyi bitirir (S1/S2); `current` burada null olur.
  }
  return { sentences, paragraphs };
}
