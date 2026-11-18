/**
 * Genel API tipleri (Bölüm 8). Şartnamedeki tanımlar birebir izlenir.
 */

export interface AnalyzeOptions {
  /** Tekil satır sonlarını boşluk say (PDF'ten kopyalanan metinler). Varsayılan: false */
  joinLines?: boolean;
  /** Sade karşılık önerileri. Varsayılan: true */
  suggestions?: boolean;
  thresholds?: {
    /** Varsayılan 20 */
    longSentence?: number;
    /** Varsayılan 30 */
    veryLongSentence?: number;
    /** Varsayılan 6 */
    longWord?: number;
  };
}

export type WordKind = "word" | "number" | "mixed" | "abbr" | "unit" | "symbol";

export interface Word {
  text: string;
  start: number;
  end: number;
  syllables: number;
  kind: WordKind;
}

export interface Sentence {
  /** 0'dan başlar */
  index: number;
  text: string;
  start: number;
  end: number;
  words: Word[];
  wordCount: number;
  syllableCount: number;
}

export type IssueType = "long-sentence" | "very-long-sentence" | "long-word" | "plain-alternative";

export interface Issue {
  type: IssueType;
  /** Sentence.index */
  sentence: number;
  start: number;
  end: number;
  /** normalizedText.slice(start, end) */
  text: string;
  /** Türkçe, 7.11'deki kalıplar */
  message: string;
  /** Yalnızca plain-alternative */
  suggestion?: string;
  /** Yalnızca cümle türleri */
  wordCount?: number;
  /** Yalnızca long-word */
  syllables?: number;
}

export type AtesmanLevel = "cok-kolay" | "kolay" | "orta" | "zor" | "cok-zor";
export type CetinkayaUzunLevel = "bagimsiz" | "egitsel" | "engelleyici";
export type BezirciYilmazLevel = "ilkogretim" | "lise" | "lisans" | "akademik";

export interface Score<L extends string> {
  /** Yuvarlanmamış */
  score: number;
  level: L;
  /** Türkçe etiket */
  label: string;
}

export interface Warning {
  code: "empty" | "short-text";
  message: string;
}

export interface SyllableDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  "6+": number;
}

export interface Analysis {
  algorithmVersion: 1;
  normalizedText: string;
  counts: {
    characters: number;
    letters: number;
    words: number;
    sentences: number;
    syllables: number;
    paragraphs: number;
  };
  averages: { syllablesPerWord: number; wordsPerSentence: number } | null;
  syllableDistribution: SyllableDistribution;
  scores: {
    atesman: Score<AtesmanLevel>;
    cetinkayaUzun: Score<CetinkayaUzunLevel>;
    bezirciYilmaz: Score<BezirciYilmazLevel>;
  } | null;
  sentences: Sentence[];
  /** start'a göre artan; eşitlikte: cümle türleri, long-word, plain-alternative sırası */
  issues: Issue[];
  warnings: Warning[];
  ignored: { urls: number; emails: number };
}
