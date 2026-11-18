/**
 * Sayıların okunuşu (Bölüm 7.8).
 *
 * Sayılar Türkçe okunuşlarına çevrilir; hece okunuştan sayılır.
 */

import { countVowels, isVowel } from "./turkish.js";

const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
const SCALES = ["", "bin", "milyon", "milyar", "trilyon"];
const DIGITS = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];

/** Tam sayı okunuşu (Bölüm 7.8.1), 0 ≤ n < 10¹⁵. Sözcükler dizi olarak döner. */
export function cardinal(value: number): string[] {
  let rest = Math.trunc(value);
  if (rest === 0) return ["sıfır"];
  const groups: number[] = [];
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const words: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (!group) continue;
    const hundreds = Math.floor(group / 100);
    const tens = Math.floor((group % 100) / 10);
    const ones = group % 10;
    const groupWords: string[] = [];
    if (hundreds) {
      if (hundreds > 1) groupWords.push(ONES[hundreds] as string);
      groupWords.push("yüz");
    }
    if (tens) groupWords.push(TENS[tens] as string);
    if (ones) groupWords.push(ONES[ones] as string);
    if (index === 1 && group === 1) {
      words.push("bin");
    } else {
      words.push(...groupWords);
      if (index > 0) words.push(SCALES[index] as string);
    }
  }
  return words;
}

const digitByDigit = (value: string): string[] =>
  [...value].map((char) => DIGITS[Number(char)] as string);

function intWords(digits: string, groupMode: boolean): string[] {
  if (/^0+$/.test(digits)) return ["sıfır"];
  let value = digits;
  if (groupMode) {
    value = value.replace(/^0+/, "");
  } else if (value.startsWith("0")) {
    // Başında sıfır varsa (0532, 007) basamak basamak okunur (Bölüm 7.8.3).
    return digitByDigit(value);
  }
  if (value.length > 15) return digitByDigit(value);
  return cardinal(Number(value));
}

function fracWords(fraction: string): string[] {
  // Baştaki sıfır sayısı: `^0*` eşleşmesinin uzunluğu.
  const leadingZeros = fraction.length - fraction.replace(/^0+/, "").length;
  const rest = fraction.slice(leadingZeros);
  const words = Array<string>(leadingZeros).fill("sıfır");
  if (rest) words.push(...intWords(rest, false));
  return words;
}

/** Rakam bölütünün çözümlenmesi (Bölüm 7.8.2). Sözcükler dizi olarak döner. */
export function numberWords(value: string): string[] {
  const grouped = value.match(/^(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/);
  if (grouped) {
    const words = intWords((grouped[1] as string).replace(/\./g, ""), false);
    const fraction = grouped[2];
    if (fraction !== undefined) words.push("virgül", ...fracWords(fraction));
    return words;
  }
  const decimal = value.match(/^(\d+),(\d+)$/);
  if (decimal) {
    return [...intWords(decimal[1] as string, false), "virgül", ...fracWords(decimal[2] as string)];
  }
  if (/^\d+$/.test(value)) return intWords(value, false);
  return value
    .split(/[.,:/]/)
    .filter((group) => group !== "")
    .flatMap((group) => intWords(group, true));
}

/** Rakam dizisinin Türkçe okunuşu (Bölüm 8), ör. `"1.250"` → `"bin iki yüz elli"`. */
export function numberToWords(digits: string): string {
  return numberWords(digits).join(" ");
}

/** Sözcük dizisinin hece toplamı. */
export function wordsSyllables(words: readonly string[]): number {
  return words.reduce((total, word) => total + countVowels(word), 0);
}

/** Sıra eki hece katkısı (Bölüm 7.8.4): son sözcük ünlüyle bitiyorsa +1, değilse +2. */
export function ordinalExtra(words: readonly string[]): number {
  // Boş dizi pratikte olmaz; "" için `isVowel` yanlıştır ve +2 döner.
  const finalChar = words.join(" ").slice(-1);
  return isVowel(finalChar) ? 1 : 2;
}

/** Romen rakamı → tam sayı (Bölüm 7.8.5). Yalnızca `I`, `V`, `X` beklenir. */
export function romanToNumber(value: string): number {
  const values = new Map<string, number>([
    ["I", 1],
    ["V", 5],
    ["X", 10],
  ]);
  const chars = [...value];
  let total = 0;
  for (let index = 0; index < chars.length; index += 1) {
    // Son karakterde `next` tanımsızdır; `current < undefined` yanlış döner.
    const current = values.get(chars[index] as string) as number;
    const next = values.get(chars[index + 1] as string) as number;
    total += current < next ? -current : current;
  }
  return total;
}
