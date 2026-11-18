import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countSyllables } from "../src/syllables.js";

interface SyllableOptions {
  acronyms?: boolean;
  afterNumber?: boolean;
  ordinal?: boolean;
}

interface SyllableVector {
  input: string;
  options?: SyllableOptions;
  syllables: number;
}

// Vektörler node:fs ile okunur; JSON içe aktarma sözdizimi kullanılmaz (Bölüm 11).
const vectors = JSON.parse(
  readFileSync(new URL("./vectors/syllables.json", import.meta.url), "utf8"),
) as SyllableVector[];

describe("countSyllables — kenar durumlar (7.7)", () => {
  it("yalnızca yüzde işareti: extra 2 hece", () => {
    expect(countSyllables("%")).toBe(2);
  });
});

describe("Romen sıra sayısı (7.7 adım 3)", () => {
  it("XIX ordinal → on dokuz + uncu = 5", () => {
    expect(countSyllables("XIX", { ordinal: true })).toBe(5);
  });

  it("II ordinal → iki + nci = 3", () => {
    expect(countSyllables("II", { ordinal: true })).toBe(3);
  });

  it("IV ordinal → dört + üncü = 3", () => {
    expect(countSyllables("IV", { ordinal: true })).toBe(3);
  });

  it("ordinal olmadan XIX Romen sayı okunmaz: harf kuralı = 3", () => {
    expect(countSyllables("XIX")).toBe(3);
  });

  it("yüzde işareti sıra ekinin önüne eklenir", () => {
    expect(countSyllables("%XIX", { ordinal: true })).toBe(7);
  });
});

describe("syllables.json — countSyllables", () => {
  it("vektör dosyasında 73 hece vektörü var", () => {
    expect(vectors).toHaveLength(73);
  });

  for (const vector of vectors) {
    const label = vector.options
      ? `${vector.input} ${JSON.stringify(vector.options)}`
      : vector.input;
    it(`${label} → ${vector.syllables}`, () => {
      expect(countSyllables(vector.input, vector.options)).toBe(vector.syllables);
    });
  }
});
