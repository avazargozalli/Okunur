/**
 * Tanılama (Bölüm 7.11): uzun cümle, uzun kelime ve sade karşılık bulguları.
 *
 * Bulgular `start` artan sırada döner; eşitlikte cümle türleri, `long-word`,
 * `plain-alternative` sırası geçerlidir (Bölüm 8).
 */

import type { PlainAlternative } from "./data/plain-alternatives.js";
import { PLAIN_ALTERNATIVES } from "./data/plain-alternatives.js";
import { fold } from "./turkish.js";
import type { Issue, IssueType, Sentence } from "./types.js";

export interface Thresholds {
  longSentence: number;
  veryLongSentence: number;
  longWord: number;
}

/** Varsayılan eşikler (Bölüm 7.11). */
export const DEFAULT_THRESHOLDS: Thresholds = {
  longSentence: 20,
  veryLongSentence: 30,
  longWord: 6,
};

/** Sıralama kuralındaki tür önceliği. */
const TYPE_ORDER: Readonly<Record<IssueType, number>> = {
  "long-sentence": 0,
  "very-long-sentence": 0,
  "long-word": 1,
  "plain-alternative": 2,
};

/**
 * Tanılamanın ihtiyaç duyduğu analiz parçası.
 * `diagnose` yalnızca cümleler ve normalize metin üzerinden çalışır.
 */
export interface DiagnosableAnalysis {
  normalizedText: string;
  sentences: readonly Sentence[];
}

interface Match {
  entry: PlainAlternative;
  length: number;
}

/**
 * Bir cümlenin kelimelerini soldan sağa tarayıp sade karşılık bulguları üretir (7.11.3).
 * Aynı konumda birden çok eşleşme varsa en çok sözcüklü kalıp seçilir.
 */
function plainAlternativeIssues(analysis: DiagnosableAnalysis, sentence: Sentence): Issue[] {
  const issues: Issue[] = [];
  const folded = sentence.words.map((word) => fold(word.text));
  for (let index = 0; index < folded.length; index += 1) {
    // Aynı konumda birden çok eşleşme olabilir; en çok sözcüklü kalıp seçilir.
    const candidates: Match[] = [];
    for (const entry of PLAIN_ALTERNATIVES) {
      for (const pattern of entry.patterns) {
        const patternWords = pattern.split(" ");
        if (index + patternWords.length > folded.length) continue;
        let matches = true;
        for (let offset = 0; offset < patternWords.length; offset += 1) {
          const isLast = offset === patternWords.length - 1;
          const query = fold(patternWords[offset] as string);
          const target = folded[index + offset] as string;
          // Son sözcük: `exact` ise tam eşitlik, değilse ön ek eşleşmesi.
          const failed = isLast && !entry.exact ? !target.startsWith(query) : target !== query;
          if (failed) {
            matches = false;
            break;
          }
        }
        if (matches) candidates.push({ entry, length: patternWords.length });
      }
    }
    if (candidates.length === 0) continue;
    candidates.sort((left, right) => right.length - left.length);
    const best = candidates[0] as Match;
    const first = sentence.words[index] as Sentence["words"][number];
    const last = sentence.words[index + best.length - 1] as Sentence["words"][number];
    issues.push({
      type: "plain-alternative",
      sentence: sentence.index,
      start: first.start,
      end: last.end,
      text: analysis.normalizedText.slice(first.start, last.end),
      message: `Daha sade karşılık: ${best.entry.suggestion}`,
      suggestion: best.entry.suggestion,
    });
    index += best.length - 1;
  }
  return issues;
}

/** Bütün bulguları üretir ve Bölüm 8'deki sıralamaya göre dizer. */
export function diagnose(
  analysis: DiagnosableAnalysis,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
  suggestions = true,
): Issue[] {
  const issues: Issue[] = [];
  for (const sentence of analysis.sentences) {
    const wordCount = sentence.words.length;
    if (wordCount >= thresholds.veryLongSentence) {
      issues.push({
        type: "very-long-sentence",
        sentence: sentence.index,
        start: sentence.start,
        end: sentence.end,
        text: sentence.text,
        message: `Bu cümle ${wordCount} kelime; çok uzun. Bölün.`,
        wordCount,
      });
    } else if (wordCount >= thresholds.longSentence) {
      issues.push({
        type: "long-sentence",
        sentence: sentence.index,
        start: sentence.start,
        end: sentence.end,
        text: sentence.text,
        message: `Bu cümle ${wordCount} kelime. İkiye bölmeyi düşünün.`,
        wordCount,
      });
    }
    for (const word of sentence.words) {
      if (word.kind === "word" && word.syllables >= thresholds.longWord) {
        issues.push({
          type: "long-word",
          sentence: sentence.index,
          start: word.start,
          end: word.end,
          text: word.text,
          message: `${word.syllables} heceli uzun kelime. Daha kısa bir karşılığı var mı?`,
          syllables: word.syllables,
        });
      }
    }
    if (suggestions) {
      issues.push(...plainAlternativeIssues(analysis, sentence));
    }
  }
  // Array.prototype.sort kararlıdır; eşit start ve türde üretim sırası korunur.
  issues.sort(
    (left, right) => left.start - right.start || TYPE_ORDER[left.type] - TYPE_ORDER[right.type],
  );
  return issues;
}
