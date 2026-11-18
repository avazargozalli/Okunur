import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.js";
import type { Analysis } from "../src/types.js";

interface TextVector {
  id: string;
  input: string;
  counts: { sentences: number; words: number; syllables: number; paragraphs: number };
  wordsPerSentence: number[];
  syllableDistribution: Record<"1" | "2" | "3" | "4" | "5" | "6+", number>;
  ignored: { urls: number; emails: number };
  scores: {
    atesman: { score: number; level: string };
    cetinkayaUzun: { score: number; level: string };
    bezirciYilmaz: { score: number; level: string };
  };
  issues: unknown[];
}

// Vektörler node:fs ile okunur; JSON içe aktarma sözdizimi kullanılmaz (Bölüm 11).
const vectors = JSON.parse(
  readFileSync(new URL("./vectors/texts.json", import.meta.url), "utf8"),
) as TextVector[];

/** Bölüm 11'deki konum tutarlılığı denetimleri. */
function expectConsistentPositions(analysis: Analysis): void {
  const text = analysis.normalizedText;
  let previousSentenceEnd = 0;
  for (const sentence of analysis.sentences) {
    expect(text.slice(sentence.start, sentence.end)).toBe(sentence.text);
    expect(sentence.start).toBeGreaterThanOrEqual(previousSentenceEnd);
    previousSentenceEnd = sentence.end;
    let previousWordEnd = sentence.start;
    for (const word of sentence.words) {
      expect(text.slice(word.start, word.end)).toBe(word.text);
      expect(word.start).toBeGreaterThanOrEqual(previousWordEnd);
      expect(word.start).toBeGreaterThanOrEqual(sentence.start);
      expect(word.end).toBeLessThanOrEqual(sentence.end);
      previousWordEnd = word.end;
    }
  }
  const wordTotal = analysis.sentences.reduce((total, sentence) => total + sentence.wordCount, 0);
  const syllableTotal = analysis.sentences.reduce(
    (total, sentence) => total + sentence.syllableCount,
    0,
  );
  expect(analysis.counts.words).toBe(wordTotal);
  expect(analysis.counts.syllables).toBe(syllableTotal);
  const distributionTotal = Object.values(analysis.syllableDistribution).reduce(
    (total, value) => total + value,
    0,
  );
  expect(distributionTotal).toBe(analysis.counts.words);
}

describe("texts.json — uçtan uca analiz", () => {
  it("vektör dosyasında 3 metin vektörü var", () => {
    expect(vectors).toHaveLength(3);
  });

  for (const vector of vectors) {
    it(vector.id, () => {
      const analysis = analyze(vector.input);
      // texts.json yalnızca dört sayımı verir; karakter/harf sayımları ayrıca doğrulanır.
      expect(analysis.counts.sentences).toBe(vector.counts.sentences);
      expect(analysis.counts.words).toBe(vector.counts.words);
      expect(analysis.counts.syllables).toBe(vector.counts.syllables);
      expect(analysis.counts.paragraphs).toBe(vector.counts.paragraphs);
      expect(analysis.counts.characters).toBeGreaterThan(0);
      expect(analysis.counts.letters).toBeGreaterThan(0);
      expect(analysis.counts.letters).toBeLessThanOrEqual(analysis.counts.characters);
      expect(analysis.sentences.map((sentence) => sentence.wordCount)).toEqual(
        vector.wordsPerSentence,
      );
      expect(analysis.syllableDistribution).toEqual(vector.syllableDistribution);
      expect(analysis.ignored).toEqual(vector.ignored);
      expect(analysis.averages).not.toBeNull();
      if (analysis.scores === null) throw new Error("puanlar hesaplanmalıydı");
      expect(analysis.scores.atesman.score).toBeCloseTo(vector.scores.atesman.score, 3);
      expect(analysis.scores.atesman.level).toBe(vector.scores.atesman.level);
      expect(analysis.scores.cetinkayaUzun.score).toBeCloseTo(vector.scores.cetinkayaUzun.score, 3);
      expect(analysis.scores.cetinkayaUzun.level).toBe(vector.scores.cetinkayaUzun.level);
      expect(analysis.scores.bezirciYilmaz.score).toBeCloseTo(vector.scores.bezirciYilmaz.score, 3);
      expect(analysis.scores.bezirciYilmaz.level).toBe(vector.scores.bezirciYilmaz.level);
      for (const score of Object.values(analysis.scores)) {
        expect(score.label.length).toBeGreaterThan(0);
      }
      expectConsistentPositions(analysis);
    });
  }

  for (const vector of vectors) {
    it(`${vector.id}: deterministik`, () => {
      expect(analyze(vector.input)).toEqual(analyze(vector.input));
    });
  }
});

describe("analyze — kenar durumlar", () => {
  it("boş metin", () => {
    const analysis = analyze("");
    expect(analysis.normalizedText).toBe("");
    expect(analysis.counts).toEqual({
      characters: 0,
      letters: 0,
      words: 0,
      sentences: 0,
      syllables: 0,
      paragraphs: 0,
    });
    expect(analysis.sentences).toEqual([]);
    expect(analysis.issues).toEqual([]);
    expect(analysis.averages).toBeNull();
    expect(analysis.scores).toBeNull();
    expect(analysis.warnings).toEqual([
      { code: "empty", message: "Metin boş; ölçülecek kelime yok." },
    ]);
  });

  it("yalnızca boşluk", () => {
    const analysis = analyze(" \n\t\n\u00A0 ");
    expect(analysis.counts.words).toBe(0);
    expect(analysis.counts.sentences).toBe(0);
    // Sekme/NBSP normalizasyonda normal boşluğa döner; boş satırlar blok sayılmaz.
    expect(analysis.normalizedText).toBe(" \n \n  ");
    expect(analysis.scores).toBeNull();
    expect(analysis.warnings.map((warning) => warning.code)).toEqual(["empty"]);
  });

  it("dize olmayan girdi TypeError fırlatır", () => {
    expect(() => analyze(42 as unknown as string)).toThrow(TypeError);
    expect(() => analyze(null as unknown as string)).toThrow(TypeError);
  });

  it("kısa metin uyarısı", () => {
    const analysis = analyze(vectors[0]?.input ?? "");
    expect(analysis.warnings).toEqual([
      {
        code: "short-text",
        message: "Metin 100 kelimeden kısa; formül sonuçları kısa metinlerde güvenilir değildir.",
      },
    ]);
  });

  it("joinLines: tekil satır sonlarını birleştirir", () => {
    const analysis = analyze("Bu satır\nikiye bölünmüş.\n\nYeni paragraf.", { joinLines: true });
    expect(analysis.sentences.map((sentence) => sentence.text)).toEqual([
      "Bu satır ikiye bölünmüş.",
      "Yeni paragraf.",
    ]);
    expect(analysis.counts.paragraphs).toBe(2);
  });

  it("yalnızca noktalama içeren metinde cümle yoktur", () => {
    const analysis = analyze("...");
    expect(analysis.sentences).toEqual([]);
    expect(analysis.counts.words).toBe(0);
    expect(analysis.warnings.map((warning) => warning.code)).toEqual(["empty"]);
  });

  it("100 ve daha fazla kelimede kısa metin uyarısı yok", () => {
    const input = `${Array.from({ length: 100 }, () => "ve").join(" ")}.`;
    const analysis = analyze(input);
    expect(analysis.counts.words).toBe(100);
    expect(analysis.warnings).toEqual([]);
  });

  it("geçersiz eşik değerleri varsayılana döner", () => {
    const input = `${Array.from({ length: 20 }, () => "ve").join(" ")}.`;
    const analysis = analyze(input, {
      thresholds: { longSentence: 0, veryLongSentence: Number.NaN },
    });
    expect(analysis.issues.map((issue) => issue.type)).toEqual(["long-sentence"]);
  });

  it("XIX. yüzyıl: Romen sıra sayısı kelime hecesi değişmez (5)", () => {
    const analysis = analyze("XIX. yüzyıl");
    const words = analysis.sentences[0]?.words ?? [];
    expect(words.map((word) => [word.text, word.syllables, word.kind])).toEqual([
      ["XIX", 5, "number"],
      ["yüzyıl", 2, "word"],
    ]);
    expect(analysis.counts.syllables).toBe(7);
  });

  it("karakter ve harf sayımları kod noktasına göredir", () => {
    const analysis = analyze("İki kelime.");
    expect(analysis.counts.characters).toBe(11);
    expect(analysis.counts.letters).toBe(9);
  });
});
