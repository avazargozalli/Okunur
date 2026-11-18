/**
 * okunur — Türkçe metinler için okunabilirlik ölçer (Bölüm 8).
 *
 * Bu dosya yalnızca dışa aktarımları içerir.
 */

import { ALGORITHM_VERSION, analyze } from "./analyze.js";

/** package.json sürümü. */
export const VERSION = "0.1.0";

export {
  atesman,
  atesmanLevel,
  bezirciYilmaz,
  bezirciYilmazLevel,
  cetinkayaUzun,
  cetinkayaUzunLevel,
} from "./formulas.js";
export { numberToWords } from "./numbers.js";
export { countSyllables } from "./syllables.js";
export type {
  Analysis,
  AnalyzeOptions,
  AtesmanLevel,
  BezirciYilmazLevel,
  CetinkayaUzunLevel,
  Issue,
  IssueType,
  Score,
  Sentence,
  SyllableDistribution,
  Warning,
  Word,
  WordKind,
} from "./types.js";
export { ALGORITHM_VERSION, analyze };
