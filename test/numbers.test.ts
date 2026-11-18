import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardinal, numberToWords } from "../src/numbers.js";
import { countVowels } from "../src/turkish.js";

interface CardinalVector {
  n: number;
  words: string;
  syllables: number;
}

interface NumberWordsVector {
  input: string;
  words: string;
  syllables: number;
}

interface NumbersVectors {
  cardinal: CardinalVector[];
  numberWords: NumberWordsVector[];
}

// Vektörler node:fs ile okunur; JSON içe aktarma sözdizimi kullanılmaz (Bölüm 11).
const vectors = JSON.parse(
  readFileSync(new URL("./vectors/numbers.json", import.meta.url), "utf8"),
) as NumbersVectors;

const syllableCount = (words: readonly string[]): number =>
  words.reduce((total, word) => total + countVowels(word), 0);

describe("numbers.json — cardinal", () => {
  it("vektör dosyasında 30 cardinal vektörü var", () => {
    expect(vectors.cardinal).toHaveLength(30);
  });

  for (const vector of vectors.cardinal) {
    it(`${vector.n} → "${vector.words}"`, () => {
      const words = cardinal(vector.n);
      expect(words.join(" ")).toBe(vector.words);
      expect(syllableCount(words)).toBe(vector.syllables);
    });
  }
});

describe("numbers.json — numberWords", () => {
  it("vektör dosyasında 19 numberWords vektörü var", () => {
    expect(vectors.numberWords).toHaveLength(19);
  });

  for (const vector of vectors.numberWords) {
    it(`"${vector.input}" → "${vector.words}"`, () => {
      const words = numberToWords(vector.input);
      expect(words).toBe(vector.words);
      expect(syllableCount(words.split(" "))).toBe(vector.syllables);
    });
  }
});

describe("numberToWords — Bölüm 8 örneği", () => {
  it('"1.250" → "bin iki yüz elli"', () => {
    expect(numberToWords("1.250")).toBe("bin iki yüz elli");
  });
});
