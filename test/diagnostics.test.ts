import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.js";
import type { Analysis, IssueType } from "../src/types.js";

interface VectorIssue {
  type: IssueType;
  sentence: number;
  text: string;
  suggestion?: string;
  syllables?: number;
}

interface TextVector {
  id: string;
  input: string;
  issues: VectorIssue[];
}

// Vektörler node:fs ile okunur; JSON içe aktarma sözdizimi kullanılmaz (Bölüm 11).
const vectors = JSON.parse(
  readFileSync(new URL("./vectors/texts.json", import.meta.url), "utf8"),
) as TextVector[];

const issueKey = (issue: { type: string; sentence: number; text: string }): string =>
  `${issue.type}|${issue.sentence}|${issue.text}`;

/** Bölüm 8 sıralama kuralı: start artan; eşitlikte cümle türleri, long-word, plain-alternative. */
function typeRank(type: IssueType): number {
  if (type === "long-sentence" || type === "very-long-sentence") return 0;
  if (type === "long-word") return 1;
  return 2;
}

function expectSorted(analysis: Analysis): void {
  for (let index = 1; index < analysis.issues.length; index += 1) {
    const previous = analysis.issues[index - 1];
    const current = analysis.issues[index];
    if (!previous || !current) continue;
    expect(current.start).toBeGreaterThanOrEqual(previous.start);
    if (current.start === previous.start) {
      expect(typeRank(current.type)).toBeGreaterThanOrEqual(typeRank(previous.type));
    }
  }
}

function wordSentence(wordCount: number): string {
  return `${Array.from({ length: wordCount }, () => "ve").join(" ")}.`;
}

describe("texts.json — issues", () => {
  for (const vector of vectors) {
    it(vector.id, () => {
      const analysis = analyze(vector.input);
      const got = analysis.issues.map((issue) => ({
        type: issue.type,
        sentence: issue.sentence,
        text: issue.text,
        suggestion: issue.suggestion,
      }));
      // Sıra referans koddaki üretim sırasıdır; küme olarak karşılaştırılır (Ek B.4).
      expect(new Set(got.map(issueKey))).toEqual(new Set(vector.issues.map(issueKey)));
      expect(got).toHaveLength(vector.issues.length);
      for (const expected of vector.issues) {
        const actual = got.find((issue) => issueKey(issue) === issueKey(expected));
        if (expected.suggestion !== undefined) {
          expect(actual?.suggestion).toBe(expected.suggestion);
        }
      }
      for (const issue of analysis.issues) {
        expect(analysis.normalizedText.slice(issue.start, issue.end)).toBe(issue.text);
        expect(issue.message.length).toBeGreaterThan(0);
        expect(issue.sentence).toBeGreaterThanOrEqual(0);
        expect(issue.sentence).toBeLessThan(analysis.sentences.length);
      }
      expectSorted(analysis);
    });
  }
});

describe("issues — sıralama kuralı", () => {
  it("start artan, eşitlikte cümle türleri < long-word < plain-alternative", () => {
    const input =
      "İşbu belge değerlendirilebilmesi için istinaden hazırlandı ve müdürlüğümüze tevdi edilmesi " +
      "gerekmektedir ayrıca sonuçlar yeniden incelendi ve rapor tamamlandı bugün sonunda.";
    const analysis = analyze(input);
    expectSorted(analysis);
    // Cümle bulgusu ile ilk kelimenin sade karşılığı aynı konumda başlar; cümle önce gelir.
    expect(analysis.issues[0]?.type).toBe("long-sentence");
    expect(analysis.issues[0]?.start).toBe(0);
    expect(analysis.issues[1]?.type).toBe("plain-alternative");
    expect(analysis.issues[1]?.start).toBe(0);
    const starts = analysis.issues.map((issue) => issue.start);
    expect([...starts].sort((left, right) => left - right)).toEqual(starts);
  });
});

describe("issues — ileti kalıpları", () => {
  it("uzun cümle ve çok uzun cümle", () => {
    const longAnalysis = analyze(wordSentence(20));
    const long = longAnalysis.issues.find((issue) => issue.type === "long-sentence");
    expect(long?.message).toBe("Bu cümle 20 kelime. İkiye bölmeyi düşünün.");
    expect(long?.wordCount).toBe(20);
    expect(long?.start).toBe(0);
    expect(long?.end).toBe(longAnalysis.sentences[0]?.end ?? -1);

    const veryLongAnalysis = analyze(wordSentence(30));
    const veryLong = veryLongAnalysis.issues.find((issue) => issue.type === "very-long-sentence");
    expect(veryLong?.message).toBe("Bu cümle 30 kelime; çok uzun. Bölün.");
    expect(veryLong?.wordCount).toBe(30);
  });

  it("uzun kelime", () => {
    const wordAnalysis = analyze("Bu okunabilirlik.");
    const longWord = wordAnalysis.issues.find((issue) => issue.type === "long-word");
    expect(longWord?.text).toBe("okunabilirlik");
    expect(longWord?.syllables).toBe(6);
    expect(longWord?.message).toBe("6 heceli uzun kelime. Daha kısa bir karşılığı var mı?");
    expect(longWord?.suggestion).toBeUndefined();
  });

  it("sade karşılık", () => {
    const suggestions = analyze("Bu husus yapıldı.");
    expect(suggestions.issues.find((issue) => issue.type === "plain-alternative")).toBeUndefined();
    const analysis = analyze("Buna istinaden işbu belge düzenlendi.");
    const plain = analysis.issues.filter((issue) => issue.type === "plain-alternative");
    expect(plain.map((issue) => issue.text)).toEqual(["istinaden", "işbu"]);
    expect(plain.map((issue) => issue.suggestion)).toEqual(["dayanarak", "bu"]);
    expect(plain[0]?.message).toBe("Daha sade karşılık: dayanarak");
  });
});

describe("issues — eşikler", () => {
  it("20 ve 30 kelime sınırları (varsayılan)", () => {
    expect(analyze(wordSentence(19)).issues).toEqual([]);
    expect(analyze(wordSentence(20)).issues.map((issue) => issue.type)).toEqual(["long-sentence"]);
    expect(analyze(wordSentence(29)).issues.map((issue) => issue.type)).toEqual(["long-sentence"]);
    expect(analyze(wordSentence(30)).issues.map((issue) => issue.type)).toEqual([
      "very-long-sentence",
    ]);
  });

  it("uzun kelime eşiği (varsayılan 6)", () => {
    expect(analyze("Bu okunabilirlik").issues.map((issue) => issue.type)).toEqual(["long-word"]);
    expect(analyze("Bu kelime").issues).toEqual([]);
  });

  it("eşik seçenekleri", () => {
    const tenWords = analyze(wordSentence(10), { thresholds: { longSentence: 10 } });
    expect(tenWords.issues.map((issue) => issue.type)).toEqual(["long-sentence"]);

    const veryLong = analyze(wordSentence(10), {
      thresholds: { longSentence: 10, veryLongSentence: 10 },
    });
    expect(veryLong.issues.map((issue) => issue.type)).toEqual(["very-long-sentence"]);

    const highWordThreshold = analyze("Bu okunabilirlik.", { thresholds: { longWord: 10 } });
    expect(highWordThreshold.issues).toEqual([]);

    const lowWordThreshold = analyze("Bu sonuç.", { thresholds: { longWord: 2 } });
    expect(lowWordThreshold.issues.map((issue) => issue.type)).toEqual(["long-word"]);
  });

  it("T2 metni: eşik seçenekleriyle cümle bulguları", () => {
    const input = vectors.find((vector) => vector.id === "T2")?.input ?? "";
    const analysis = analyze(input, { thresholds: { longSentence: 5, veryLongSentence: 19 } });
    const sentenceIssues = analysis.issues.filter(
      (issue) => issue.type === "long-sentence" || issue.type === "very-long-sentence",
    );
    expect(sentenceIssues.map((issue) => [issue.sentence, issue.wordCount])).toEqual([
      [0, 19],
      [1, 19],
      [2, 5],
    ]);
    expect(sentenceIssues.map((issue) => issue.type)).toEqual([
      "very-long-sentence",
      "very-long-sentence",
      "long-sentence",
    ]);
  });
});

describe("issues — kapsam dışı kelime türleri", () => {
  it("sayılar, kısaltmalar ve birimler işaretlenmez", () => {
    const analysis = analyze("Toplam 2026 ve A.Ş. alanı 5 km2 oldu.");
    expect(analysis.issues.filter((issue) => issue.type === "long-word")).toEqual([]);
    const kinds = analysis.sentences.flatMap((sentence) => sentence.words.map((word) => word.kind));
    expect(kinds).toContain("number");
    expect(kinds).toContain("abbr");
    expect(kinds).toContain("unit");
  });
});

describe("issues — suggestions seçeneği", () => {
  it("suggestions: false sade karşılık denetimini kapatır", () => {
    const input = vectors.find((vector) => vector.id === "T2")?.input ?? "";
    const withSuggestions = analyze(input);
    const withoutSuggestions = analyze(input, { suggestions: false });
    expect(withSuggestions.issues.some((issue) => issue.type === "plain-alternative")).toBe(true);
    expect(withoutSuggestions.issues.filter((issue) => issue.type === "plain-alternative")).toEqual(
      [],
    );
    expect(
      withoutSuggestions.issues.filter((issue) => issue.type === "long-word").length,
    ).toBeGreaterThan(0);
  });
});
