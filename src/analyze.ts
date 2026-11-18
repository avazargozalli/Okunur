/**
 * Analiz akışı (Bölüm 7.1): normalizasyon → bloklar/cümleler → kelimeler → heceler
 * → sayımlar, formüller, düzeyler.
 */

import { DEFAULT_THRESHOLDS, diagnose, type Thresholds } from "./diagnostics.js";
import {
  ATESMAN_LABELS,
  atesman,
  atesmanLevel,
  BEZIRCI_YILMAZ_LABELS,
  bezirciYilmaz,
  bezirciYilmazLevel,
  CETINKAYA_UZUN_LABELS,
  cetinkayaUzun,
  cetinkayaUzunLevel,
} from "./formulas.js";
import { joinSingleLines, normalize } from "./normalize.js";
import { splitSentences } from "./sentences.js";
import type {
  Analysis,
  AnalyzeOptions,
  Score,
  Sentence,
  SyllableDistribution,
  Warning,
} from "./types.js";
import { extractWords, type IgnoredCounts } from "./words.js";

/** Algoritma sürümü (Bölüm 8). Çıktıyı değiştiren her değişiklik bunu artırır. */
export const ALGORITHM_VERSION = 1;

const EMPTY_WARNING_MESSAGE = "Metin boş; ölçülecek kelime yok.";
const SHORT_TEXT_MESSAGE =
  "Metin 100 kelimeden kısa; formül sonuçları kısa metinlerde güvenilir değildir.";

/** Hece dağılımı kovası: 1–5 tam sayı, 6 ve üzeri "6+". (0 heceli kelime d1'e sayılır.) */
function distributionKey(syllables: number): keyof SyllableDistribution {
  if (syllables >= 6) return "6+";
  const bucket = Math.max(1, syllables);
  if (bucket === 1) return 1;
  if (bucket === 2) return 2;
  if (bucket === 3) return 3;
  if (bucket === 4) return 4;
  return 5;
}

/** Geçersiz eşik değerlerinde varsayılana döner; `analyze` istisna fırlatmaz. */
function thresholdValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 ? value : fallback;
}

function resolveThresholds(options: AnalyzeOptions): Thresholds {
  return {
    longSentence: thresholdValue(
      options?.thresholds?.longSentence,
      DEFAULT_THRESHOLDS.longSentence,
    ),
    veryLongSentence: thresholdValue(
      options?.thresholds?.veryLongSentence,
      DEFAULT_THRESHOLDS.veryLongSentence,
    ),
    longWord: thresholdValue(options?.thresholds?.longWord, DEFAULT_THRESHOLDS.longWord),
  };
}

/** Yuvarlanmamış puandan düzey ve Türkçe etiket üretir. */
function buildScore<L extends string>(
  value: number,
  levelOf: (score: number) => L,
  labels: Readonly<Record<L, string>>,
): Score<L> {
  const level = levelOf(value);
  return { score: value, level, label: labels[level] };
}

/**
 * Bir metni çözümler (Bölüm 8).
 *
 * Saf işlevdir: genel durum, tarih, rastgelelik, ağ ya da dosya sistemi kullanmaz.
 * `text` dize değilse `TypeError` fırlatır; başka hiçbir girdi için istisna fırlatmaz.
 */
export function analyze(text: string, options: AnalyzeOptions = {}): Analysis {
  if (typeof text !== "string") {
    throw new TypeError("Metin bir dize olmalıdır.");
  }
  let normalizedText = normalize(text);
  if (options?.joinLines) normalizedText = joinSingleLines(normalizedText);
  const { sentences: rawSentences, paragraphs } = splitSentences(normalizedText);
  const ignored: IgnoredCounts = { urls: 0, emails: 0 };
  const sentences: Sentence[] = [];
  const syllableDistribution: SyllableDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, "6+": 0 };
  let syllableTotal = 0;
  for (const raw of rawSentences) {
    const sentenceText = normalizedText.slice(raw.start, raw.end);
    const words = extractWords(raw.tokens, sentenceText, ignored);
    // Hiç kelimesi olmayan cümleler atılır ve sayılmaz (Bölüm 7.5).
    if (words.length === 0) continue;
    let syllableCount = 0;
    for (const word of words) {
      syllableCount += word.syllables;
      syllableDistribution[distributionKey(word.syllables)] += 1;
    }
    syllableTotal += syllableCount;
    sentences.push({
      index: sentences.length,
      text: sentenceText,
      start: raw.start,
      end: raw.end,
      words,
      wordCount: words.length,
      syllableCount,
    });
  }
  const sentenceTotal = sentences.length;
  const wordTotal = sentences.reduce((total, sentence) => total + sentence.wordCount, 0);
  const counts = {
    characters: [...normalizedText].length,
    letters: (normalizedText.match(/\p{L}/gu) ?? []).length,
    words: wordTotal,
    sentences: sentenceTotal,
    syllables: syllableTotal,
    paragraphs,
  };
  const averages =
    wordTotal > 0 && sentenceTotal > 0
      ? {
          syllablesPerWord: syllableTotal / wordTotal,
          wordsPerSentence: wordTotal / sentenceTotal,
        }
      : null;
  const scores =
    wordTotal > 0 && sentenceTotal > 0
      ? {
          atesman: buildScore(
            atesman({ words: wordTotal, sentences: sentenceTotal, syllables: syllableTotal }),
            atesmanLevel,
            ATESMAN_LABELS,
          ),
          cetinkayaUzun: buildScore(
            cetinkayaUzun({
              words: wordTotal,
              sentences: sentenceTotal,
              syllables: syllableTotal,
            }),
            cetinkayaUzunLevel,
            CETINKAYA_UZUN_LABELS,
          ),
          bezirciYilmaz: buildScore(
            bezirciYilmaz({
              words: wordTotal,
              sentences: sentenceTotal,
              distribution: syllableDistribution,
            }),
            bezirciYilmazLevel,
            BEZIRCI_YILMAZ_LABELS,
          ),
        }
      : null;
  const issues = diagnose(
    { normalizedText, sentences },
    resolveThresholds(options),
    options?.suggestions !== false,
  );
  const warnings: Warning[] = [];
  if (wordTotal === 0) {
    warnings.push({ code: "empty", message: EMPTY_WARNING_MESSAGE });
  } else if (wordTotal < 100) {
    warnings.push({ code: "short-text", message: SHORT_TEXT_MESSAGE });
  }
  return {
    algorithmVersion: ALGORITHM_VERSION,
    normalizedText,
    counts,
    averages,
    syllableDistribution,
    scores,
    sentences,
    issues,
    warnings,
    ignored: { urls: ignored.urls, emails: ignored.emails },
  };
}
