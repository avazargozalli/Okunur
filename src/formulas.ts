/**
 * Formüller ve düzeyler (Bölüm 7.10).
 *
 * Formüller ham sayımlardan çalışır; `analyze` düzeyleri her zaman yuvarlanmamış
 * puandan belirler ve gösterimde puan bir ondalık basamağa yuvarlanır.
 */

import type {
  AtesmanLevel,
  BezirciYilmazLevel,
  CetinkayaUzunLevel,
  SyllableDistribution,
} from "./types.js";

/** Formüllerin ortak girdisi: kelime, cümle ve hece sayıları. */
export interface Counts {
  words: number;
  sentences: number;
  syllables: number;
}

/** Bezirci-Yılmaz girdisi: dağılım gerekir. */
export interface DistributionCounts {
  words: number;
  sentences: number;
  distribution: SyllableDistribution;
}

/** Ateşman (1997): puan = 198.825 − 40.175×x1 − 2.610×x2. */
export function atesman(counts: Counts): number {
  if (counts.words === 0 || counts.sentences === 0) return Number.NaN;
  const x1 = counts.syllables / counts.words;
  const x2 = counts.words / counts.sentences;
  return 198.825 - 40.175 * x1 - 2.61 * x2;
}

/** Çetinkaya-Uzun (2010): puan = 118.823 − 25.987×x1 − 0.971×x2. */
export function cetinkayaUzun(counts: Counts): number {
  if (counts.words === 0 || counts.sentences === 0) return Number.NaN;
  const x1 = counts.syllables / counts.words;
  const x2 = counts.words / counts.sentences;
  return 118.823 - 25.987 * x1 - 0.971 * x2;
}

/** Bezirci-Yılmaz (2010), Yeni Okunabilirlik Değeri. Yüksek değer daha zor metin demektir. */
export function bezirciYilmaz(counts: DistributionCounts): number {
  if (counts.words === 0 || counts.sentences === 0) return Number.NaN;
  const x2 = counts.words / counts.sentences;
  const sentences = counts.sentences;
  const distribution = counts.distribution;
  return Math.sqrt(
    x2 *
      ((distribution[3] / sentences) * 0.84 +
        (distribution[4] / sentences) * 1.5 +
        (distribution[5] / sentences) * 3.5 +
        (distribution["6+"] / sentences) * 26.25),
  );
}

/**
 * Düzey eşikleri. Bezirci-Yılmaz aralıkları kaynaklarda tam sayılarla ve küçük
 * farklarla verilir; kesirli değerler için bu sınırlar seçilmiştir (Bölüm 7.10.3).
 */
export const ATESMAN_THRESHOLDS = {
  cokKolay: 90,
  kolay: 70,
  orta: 50,
  zor: 30,
} as const;

export const CETINKAYA_UZUN_THRESHOLDS = {
  bagimsiz: 51,
  egitsel: 35,
} as const;

export const BEZIRCI_YILMAZ_THRESHOLDS = {
  ilkogretim: 8,
  lise: 12,
  lisans: 16,
} as const;

export function atesmanLevel(score: number): AtesmanLevel {
  if (score >= ATESMAN_THRESHOLDS.cokKolay) return "cok-kolay";
  if (score >= ATESMAN_THRESHOLDS.kolay) return "kolay";
  if (score >= ATESMAN_THRESHOLDS.orta) return "orta";
  if (score >= ATESMAN_THRESHOLDS.zor) return "zor";
  return "cok-zor";
}

export function cetinkayaUzunLevel(score: number): CetinkayaUzunLevel {
  if (score >= CETINKAYA_UZUN_THRESHOLDS.bagimsiz) return "bagimsiz";
  if (score >= CETINKAYA_UZUN_THRESHOLDS.egitsel) return "egitsel";
  return "engelleyici";
}

export function bezirciYilmazLevel(score: number): BezirciYilmazLevel {
  if (score <= BEZIRCI_YILMAZ_THRESHOLDS.ilkogretim) return "ilkogretim";
  if (score <= BEZIRCI_YILMAZ_THRESHOLDS.lise) return "lise";
  if (score <= BEZIRCI_YILMAZ_THRESHOLDS.lisans) return "lisans";
  return "akademik";
}

export const ATESMAN_LABELS: Readonly<Record<AtesmanLevel, string>> = {
  "cok-kolay": "Çok kolay",
  kolay: "Kolay",
  orta: "Orta güçlükte",
  zor: "Zor",
  "cok-zor": "Çok zor",
};

export const CETINKAYA_UZUN_LABELS: Readonly<Record<CetinkayaUzunLevel, string>> = {
  bagimsiz: "Bağımsız okuma düzeyi (5–7. sınıf)",
  egitsel: "Eğitsel okuma düzeyi (8–9. sınıf)",
  engelleyici: "Engelleyici okuma düzeyi (10–12. sınıf)",
};

export const BEZIRCI_YILMAZ_LABELS: Readonly<Record<BezirciYilmazLevel, string>> = {
  ilkogretim: "İlköğretim",
  lise: "Lise",
  lisans: "Lisans",
  akademik: "Akademik",
};
