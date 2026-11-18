import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  atesman,
  atesmanLevel,
  bezirciYilmaz,
  bezirciYilmazLevel,
  cetinkayaUzun,
  cetinkayaUzunLevel,
} from "../src/formulas.js";
import type { SyllableDistribution } from "../src/types.js";

interface FormulaVector {
  words: number;
  sentences: number;
  syllables: number;
  syllableDistribution: SyllableDistribution;
  atesman: number;
  cetinkayaUzun: number;
  bezirciYilmaz: number;
}

// Vektörler node:fs ile okunur; JSON içe aktarma sözdizimi kullanılmaz (Bölüm 11).
const vectors = JSON.parse(
  readFileSync(new URL("./vectors/formulas.json", import.meta.url), "utf8"),
) as FormulaVector[];

const EMPTY_DISTRIBUTION: SyllableDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, "6+": 0 };

describe("formulas.json — ham sayımlardan formüller", () => {
  it("vektör dosyasında 3 formül vektörü var", () => {
    expect(vectors).toHaveLength(3);
  });

  for (const [index, vector] of vectors.entries()) {
    it(`vektör ${index + 1}: W=${vector.words} S=${vector.sentences} H=${vector.syllables}`, () => {
      expect(
        atesman({ words: vector.words, sentences: vector.sentences, syllables: vector.syllables }),
      ).toBeCloseTo(vector.atesman, 3);
      expect(
        cetinkayaUzun({
          words: vector.words,
          sentences: vector.sentences,
          syllables: vector.syllables,
        }),
      ).toBeCloseTo(vector.cetinkayaUzun, 3);
      expect(
        bezirciYilmaz({
          words: vector.words,
          sentences: vector.sentences,
          distribution: vector.syllableDistribution,
        }),
      ).toBeCloseTo(vector.bezirciYilmaz, 3);
    });
  }
});

describe("Ateşman düzey sınırları", () => {
  it("90/89.99, 70/69.99, 50/49.99, 30/29.99", () => {
    expect(atesmanLevel(90)).toBe("cok-kolay");
    expect(atesmanLevel(89.99)).toBe("kolay");
    expect(atesmanLevel(70)).toBe("kolay");
    expect(atesmanLevel(69.99)).toBe("orta");
    expect(atesmanLevel(50)).toBe("orta");
    expect(atesmanLevel(49.99)).toBe("zor");
    expect(atesmanLevel(30)).toBe("zor");
    expect(atesmanLevel(29.99)).toBe("cok-zor");
  });
});

describe("Çetinkaya-Uzun düzey sınırları", () => {
  it("51/50.99 ve 35/34.99", () => {
    expect(cetinkayaUzunLevel(51)).toBe("bagimsiz");
    expect(cetinkayaUzunLevel(50.99)).toBe("egitsel");
    expect(cetinkayaUzunLevel(35)).toBe("egitsel");
    expect(cetinkayaUzunLevel(34.99)).toBe("engelleyici");
  });
});

describe("Bezirci-Yılmaz düzey sınırları", () => {
  it("8/8.01, 12/12.01, 16/16.01", () => {
    expect(bezirciYilmazLevel(8)).toBe("ilkogretim");
    expect(bezirciYilmazLevel(8.01)).toBe("lise");
    expect(bezirciYilmazLevel(12)).toBe("lise");
    expect(bezirciYilmazLevel(12.01)).toBe("lisans");
    expect(bezirciYilmazLevel(16)).toBe("lisans");
    expect(bezirciYilmazLevel(16.01)).toBe("akademik");
  });
});

describe("formüller — sıfır kelime/cümle durumu", () => {
  it("words == 0 ya da sentences == 0 için NaN döner", () => {
    expect(Number.isNaN(atesman({ words: 0, sentences: 0, syllables: 0 }))).toBe(true);
    expect(Number.isNaN(cetinkayaUzun({ words: 0, sentences: 0, syllables: 0 }))).toBe(true);
    expect(
      Number.isNaN(bezirciYilmaz({ words: 0, sentences: 0, distribution: EMPTY_DISTRIBUTION })),
    ).toBe(true);
    expect(Number.isNaN(atesman({ words: 10, sentences: 0, syllables: 20 }))).toBe(true);
  });
});
