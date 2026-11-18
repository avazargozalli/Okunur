import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { joinSingleLines, normalize } from "../src/normalize.js";
import { sentenceBoundary, splitSentences } from "../src/sentences.js";
import { extractWords, type IgnoredCounts } from "../src/words.js";

interface SentenceVector {
  id: string;
  input: string;
  options?: { joinLines?: boolean };
  counts: { sentences: number; words: number; syllables: number };
  ignored: { urls: number; emails: number };
  sentences: Array<{ text: string; words: Array<[string, number]> }>;
}

// Vektörler node:fs ile okunur; JSON içe aktarma sözdizimi kullanılmaz (Bölüm 11).
const vectors = JSON.parse(
  readFileSync(new URL("./vectors/sentences.json", import.meta.url), "utf8"),
) as SentenceVector[];

interface PipelineSentence {
  text: string;
  words: Array<[string, number]>;
}

interface PipelineResult {
  counts: { sentences: number; words: number; syllables: number };
  ignored: IgnoredCounts;
  sentences: PipelineSentence[];
}

/**
 * analyze.ts henüz yok: normalize + cümle/kelime çıkarımını iki modülle birleştirir
 * (Bölüm 7.1 akışının 14.3 kapsamı).
 */
function runPipeline(input: string, options: { joinLines?: boolean } = {}): PipelineResult {
  let text = normalize(input);
  if (options.joinLines) text = joinSingleLines(text);
  const { sentences } = splitSentences(text);
  const ignored: IgnoredCounts = { urls: 0, emails: 0 };
  const result: PipelineSentence[] = [];
  for (const sentence of sentences) {
    const sentenceText = text.slice(sentence.start, sentence.end);
    const words = extractWords(sentence.tokens, sentenceText, ignored);
    if (words.length === 0) continue;
    result.push({
      text: sentenceText,
      words: words.map((word): [string, number] => [word.text, word.syllables]),
    });
  }
  const counts = {
    sentences: result.length,
    words: result.reduce((total, sentence) => total + sentence.words.length, 0),
    syllables: result.reduce(
      (total, sentence) => total + sentence.words.reduce((sum, word) => sum + word[1], 0),
      0,
    ),
  };
  return { counts, ignored, sentences: result };
}

describe("sentences.json — cümle ve kelime çıkarımı", () => {
  it("vektör dosyasında 34 cümle vektörü var", () => {
    expect(vectors).toHaveLength(34);
  });

  for (const vector of vectors) {
    it(vector.id, () => {
      const result = runPipeline(vector.input, vector.options);
      expect(result.ignored).toEqual(vector.ignored);
      expect(result.counts).toEqual(vector.counts);
      expect(result.sentences).toEqual(vector.sentences);
    });
  }
});

describe("normalizasyon (7.2)", () => {
  it("N2: satır sonlarını tekleştirir", () => {
    expect(normalize("a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("N3: görünmez karakterleri siler", () => {
    expect(normalize("a\u00ADb\u200Bc\u200Cd\u200De\u2060f\uFEFFg")).toBe("abcdefg");
  });

  it("N4: özel boşlukları normal boşluğa çevirir", () => {
    expect(normalize("a\tb\u00A0c\u2000d\u202Fe\u3000f")).toBe("a b c d e f");
  });

  it("N5: tipografik kesme işaretlerini sadeleştirir", () => {
    expect(normalize("a‘b’cʼd`e´f")).toBe("a'b'c'd'e'f");
  });

  it("N6/N7: üç nokta ve üst simge rakamlar", () => {
    expect(normalize("Bekledi… 20 m² ve 3³")).toBe("Bekledi... 20 m2 ve 33");
  });

  it("N8: eksik boşluğu onarır", () => {
    expect(normalize("Geldi.Sonra gitti.")).toBe("Geldi. Sonra gitti.");
  });

  it("joinLines: tekil satır sonlarını boşluğa çevirir, boş satırı korur", () => {
    expect(joinSingleLines("Bir\niki.\n\nÜç.")).toBe("Bir iki.\n\nÜç.");
  });
});

describe("cümle sınırı — kenar durumlar (7.5)", () => {
  it("S6: üç nokta, sonraki belirtecin ilk harfine göre karar verir", () => {
    expect(sentenceBoundary("...", "Yeni")).toEqual({ end: true, ordinal: false });
    expect(sentenceBoundary("...", "...")).toEqual({ end: false, ordinal: false });
  });

  it("S3: kapanış tırnağından sonra küçük harf gelirse bitirmez", () => {
    expect(sentenceBoundary('musun?"', "dedi")).toEqual({ end: false, ordinal: false });
    // Sonraki belirteçte harf yoksa küçük harf koşulu sağlanmaz.
    expect(sentenceBoundary('musun?"', "...")).toEqual({ end: true, ordinal: false });
  });

  it("S7: yalnızca noktalama içeren gövde", () => {
    expect(sentenceBoundary(".", "Geldi")).toEqual({ end: true, ordinal: false });
  });

  it("S9: noktalı baş harf dizisi cümle bitirmez", () => {
    expect(sentenceBoundary("A.B.D.", "Yılmaz")).toEqual({ end: false, ordinal: false });
  });

  it("S13: çok basamaklı sayı + küçük harf sıra sayısıdır", () => {
    expect(sentenceBoundary("1250.", "ankara")).toEqual({ end: false, ordinal: true });
  });
});

describe("kelime çıkarımı — kenar durumlar (7.6, 7.8)", () => {
  it("Romen sıra sayısı çıkarmalı okunur (IV → dört, +2 hece)", () => {
    expect(runPipeline("IV. bölüm").sentences).toEqual([
      {
        text: "IV. bölüm",
        words: [
          ["IV", 3],
          ["bölüm", 2],
        ],
      },
    ]);
  });

  it("noktalı baş harf dizisi tek kelime sayılır", () => {
    expect(runPipeline("A.B.D. Başkanı geldi.").sentences).toEqual([
      {
        text: "A.B.D. Başkanı geldi.",
        words: [
          ["A.B.D", 3],
          ["Başkanı", 3],
          ["geldi", 2],
        ],
      },
    ]);
  });

  it("iki yanı rakam olan eğik çizgi bölmez", () => {
    expect(runPipeline("Tarih 19/11/2026.").sentences).toEqual([
      {
        text: "Tarih 19/11/2026.",
        words: [
          ["Tarih", 2],
          ["19/11/2026", 12],
        ],
      },
    ]);
  });

  it("yan yana ayırıcılar boş parça üretir", () => {
    expect(runPipeline("A——B").sentences).toEqual([
      {
        text: "A——B",
        words: [
          ["A", 1],
          ["B", 1],
        ],
      },
    ]);
  });

  it("harf ya da rakam içermeyen parça kelime sayılmaz", () => {
    expect(runPipeline("Fiyat % arttı.").sentences).toEqual([
      {
        text: "Fiyat % arttı.",
        words: [
          ["Fiyat", 2],
          ["arttı", 2],
        ],
      },
    ]);
  });
});
