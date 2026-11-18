import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyze } from "../src/analyze.js";
import { VERSION } from "../src/index.js";
import { formatReport } from "../src/report.js";
import type { Analysis } from "../src/types.js";

interface TextVector {
  id: string;
  input: string;
}

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

// Vektörler node:fs ile okunur; JSON içe aktarma sözdizimi kullanılmaz (Bölüm 11).
const vectors = JSON.parse(
  readFileSync(new URL("./vectors/texts.json", import.meta.url), "utf8"),
) as TextVector[];

function vector(id: string): TextVector {
  const found = vectors.find((entry) => entry.id === id);
  if (!found) throw new Error(`${id} vektörü texts.json içinde yok`);
  return found;
}

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI_PATH = join(PROJECT_ROOT, "dist", "cli.js");

// Bölüm 9'daki T3 çıktısı; birebir olmalıdır.
const T3_REPORT = `okunur — ornek.txt

Ateşman           48,6  Zor
Çetinkaya-Uzun    26,6  Engelleyici okuma düzeyi (10–12. sınıf)
Bezirci-Yılmaz    12,3  Lisans

Cümle: 5 · Kelime: 35 · Hece: 115
Kelime başına hece: 3,29 · Cümle başına kelime: 7,00

Uyarılar
  ! Metin 100 kelimeden kısa; formül sonuçları kısa metinlerde güvenilir değildir.

Bulgular (1)
  5. cümle · "bakabilirsiniz": 6 heceli uzun kelime. Daha kısa bir karşılığı var mı?
`;

// Bölüm 9'daki kullanım metni; birebir olmalıdır.
const USAGE = `Kullanım: okunur [seçenekler] [dosya...]

Dosya verilmezse ya da dosya adı "-" ise standart girdiden okur.

Seçenekler:
  --json                 Sonucu JSON olarak yaz (tek dosyada nesne, çok dosyada dizi)
  --join-lines           Tekil satır sonlarını boşluk say
  --no-suggestions       Sade karşılık önerilerini kapat
  --min-atesman <sayı>   Ateşman puanı bu değerin altındaysa 1 koduyla çık
  --quiet                Yalnızca puan satırlarını yaz
  -h, --help             Bu yardımı göster
  -v, --version          Sürümü göster
`;

let tempDir = "";

/** Derlenmiş CLI'ı ayrı bir süreçte çalıştırır. */
function runCli(args: string[], options: { cwd?: string; input?: string } = {}): CliResult {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: options.cwd ?? PROJECT_ROOT,
    input: options.input,
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Testlerin çoğu için yeterli, tüm alanları boş bir analiz. */
function emptyAnalysis(): Analysis {
  return {
    algorithmVersion: 1,
    normalizedText: "",
    counts: { characters: 0, letters: 0, words: 0, sentences: 0, syllables: 0, paragraphs: 0 },
    averages: null,
    syllableDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, "6+": 0 },
    scores: null,
    sentences: [],
    issues: [],
    warnings: [],
    ignored: { urls: 0, emails: 0 },
  };
}

beforeAll(() => {
  // CI'da coverage adımı build'den önce koşar; dist/cli.js'in varlığını burada garanti et.
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(npm, ["run", "build"], {
    cwd: PROJECT_ROOT,
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  expect(existsSync(CLI_PATH)).toBe(true);

  tempDir = mkdtempSync(join(tmpdir(), "okunur-cli-"));
  writeFileSync(join(tempDir, "ornek.txt"), vector("T3").input, "utf8");
  writeFileSync(join(tempDir, "ikinci.txt"), vector("T1").input, "utf8");
}, 120_000);

afterAll(() => {
  if (tempDir !== "") rmSync(tempDir, { recursive: true, force: true });
});

describe("cli.test.ts — Bölüm 9 çıktısı", () => {
  it("T3 metni için beklenen çıktıyı birebir üretir", () => {
    const result = runCli(["ornek.txt"], { cwd: tempDir });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(T3_REPORT);
  });

  it("--quiet yalnızca üç puan satırını yazar", () => {
    const result = runCli(["--quiet", "ornek.txt"], { cwd: tempDir });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      `Ateşman           48,6  Zor
Çetinkaya-Uzun    26,6  Engelleyici okuma düzeyi (10–12. sınıf)
Bezirci-Yılmaz    12,3  Lisans
`,
    );
    expect(result.stdout).not.toContain("Cümle:");
    expect(result.stdout).not.toContain("Uyarılar");
  });

  it("--help ve -h kullanım metnini birebir yazar", () => {
    const long = runCli(["--help"]);
    const short = runCli(["-h"]);
    expect(long.status).toBe(0);
    expect(short.status).toBe(0);
    expect(long.stderr).toBe("");
    expect(short.stderr).toBe("");
    expect(long.stdout).toBe(USAGE);
    expect(short.stdout).toBe(USAGE);
  });

  it("--version ve -v sürümü VERSION'dan yazar", () => {
    const long = runCli(["--version"]);
    const short = runCli(["-v"]);
    expect(long.status).toBe(0);
    expect(short.status).toBe(0);
    expect(long.stdout).toBe(`okunur ${VERSION}\n`);
    expect(short.stdout).toBe(`okunur ${VERSION}\n`);
  });
});

describe("cli.test.ts — --json", () => {
  it("tek dosyada nesne, çok dosyada dizi ve file alanı üretir", () => {
    const single = runCli(["--json", "ornek.txt"], { cwd: tempDir });
    expect(single.status).toBe(0);
    expect(single.stderr).toBe("");
    expect(single.stdout.startsWith('{\n  "algorithmVersion": 1,')).toBe(true);
    expect(single.stdout.endsWith("\n")).toBe(true);

    const one = JSON.parse(single.stdout) as Analysis & { file: string };
    expect(one.file).toBe("ornek.txt");
    expect(one.algorithmVersion).toBe(1);
    expect(one.counts.sentences).toBe(5);
    expect(one.counts.words).toBe(35);
    expect(one.counts.syllables).toBe(115);
    if (one.scores === null) throw new Error("puanlar hesaplanmalıydı");
    expect(one.scores.atesman.score).toBeCloseTo(48.5514, 3);

    const many = runCli(["--json", "ornek.txt", "ikinci.txt"], { cwd: tempDir });
    expect(many.status).toBe(0);
    const all = JSON.parse(many.stdout) as (Analysis & { file: string })[];
    expect(Array.isArray(all)).toBe(true);
    expect(all.map((entry) => entry.file)).toEqual(["ornek.txt", "ikinci.txt"]);
    expect(all[0]?.counts.sentences).toBe(5);
    expect(all[1]?.counts.sentences).toBe(10);
  });

  it('stdin için file alanı "-" olur', () => {
    const result = runCli(["--json"], { input: vector("T3").input });
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as Analysis & { file: string };
    expect(parsed.file).toBe("-");
    expect(parsed.counts.words).toBe(35);
    expect(JSON.parse(result.stdout)).toHaveProperty("normalizedText");
  });

  it("--json ile --quiet birlikteyse JSON kazanır", () => {
    const result = runCli(["--json", "--quiet", "ornek.txt"], { cwd: tempDir });
    expect(result.status).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});

describe("cli.test.ts — stdin", () => {
  it("dosya verilmezse standart girdiden okur ve başlık yazmaz", () => {
    const result = runCli([], { input: vector("T1").input });
    expect(result.status).toBe(0);
    expect(result.stdout.startsWith("okunur\n\nAteşman")).toBe(true);
    expect(result.stdout).toContain("Cümle: 10 · Kelime: 41 · Hece: 99");
  });

  it('dosya adı "-" ise standart girdiden okur', () => {
    const result = runCli(["-"], { input: vector("T1").input });
    expect(result.status).toBe(0);
    expect(result.stdout.startsWith("okunur\n\n")).toBe(true);
  });

  it("baştaki BOM atılır", () => {
    const plain = runCli(["--json"], { input: vector("T1").input });
    const withBom = runCli(["--json"], { input: `\uFEFF${vector("T1").input}` });
    expect(withBom.stdout).toBe(plain.stdout);
  });
});

describe("cli.test.ts — çıkış kodları", () => {
  it("0: başarılı çalışma", () => {
    expect(runCli(["ornek.txt"], { cwd: tempDir }).status).toBe(0);
  });

  it("1: Ateşman puanı --min-atesman eşiğinin altında", () => {
    const result = runCli(["--min-atesman", "49", "ornek.txt"], { cwd: tempDir });
    expect(result.status).toBe(1);
    // Rapor yine yazılır.
    expect(result.stdout).toBe(T3_REPORT);
  });

  it("0: puan eşiğin üstünde", () => {
    expect(runCli(["--min-atesman", "48", "ornek.txt"], { cwd: tempDir }).status).toBe(0);
  });

  it("0: --min-atesman virgüllü ondalık kabul eder", () => {
    expect(runCli(["--min-atesman", "48,5", "ornek.txt"], { cwd: tempDir }).status).toBe(0);
  });

  it("1: çok dosyada bir dosya eşiğin altındaysa", () => {
    const result = runCli(["--min-atesman", "49", "ornek.txt", "ikinci.txt"], {
      cwd: tempDir,
    });
    expect(result.status).toBe(1);
  });

  it("2: olmayan dosya için Türkçe ileti yazar", () => {
    const result = runCli(["bu-dosya-yok.txt"], { cwd: tempDir });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Hata: "bu-dosya-yok.txt" dosyası okunamadı');
    expect(result.stderr).toContain("dosya bulunamadı");
  });

  it("2: bilinmeyen seçenek için Türkçe ileti yazar", () => {
    const result = runCli(["--bilinmeyen"]);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Hata: geçersiz kullanım: bilinmeyen seçenek: --bilinmeyen");
  });

  it("2: değer bekleyen seçenek için Türkçe ileti yazar", () => {
    const result = runCli(["--min-atesman"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("seçenek değeri geçersiz: --min-atesman");
  });

  it("2: geçersiz --min-atesman değeri", () => {
    const result = runCli(["--min-atesman", "abc", "ornek.txt"], { cwd: tempDir });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--min-atesman sayısal bir değer almalı");
  });
});

describe("cli.test.ts — seçenekler", () => {
  it("--no-suggestions sade karşılık bulgularını kapatır", () => {
    const result = runCli(["--json", "--no-suggestions"], { input: vector("T2").input });
    const parsed = JSON.parse(result.stdout) as Analysis & { file: string };
    expect(parsed.issues.length).toBeGreaterThan(0);
    expect(parsed.issues.every((issue) => issue.type === "long-word")).toBe(true);
  });

  it("--join-lines tekil satır sonlarını boşluk sayar", () => {
    const input = "Ali\ngeldi.";
    const without = JSON.parse(runCli(["--json"], { input }).stdout) as Analysis & {
      file: string;
    };
    const joined = JSON.parse(runCli(["--json", "--join-lines"], { input }).stdout) as Analysis & {
      file: string;
    };
    expect(without.counts.sentences).toBe(2);
    expect(joined.counts.sentences).toBe(1);
    expect(joined.counts.words).toBe(2);
    expect(joined.normalizedText).toBe("Ali geldi.");
  });
});

describe("formatReport — Bölüm 8/9", () => {
  it("T3 raporunu başlıkla birebir üretir", () => {
    expect(formatReport(analyze(vector("T3").input), "ornek.txt")).toBe(T3_REPORT);
  });

  it("başlık verilmezse ilk satır yalnızca okunur olur", () => {
    const report = formatReport(analyze(vector("T1").input));
    expect(report.startsWith("okunur\n\nAteşman")).toBe(true);
    expect(report).toContain("\nUyarılar\n  ! Metin 100 kelimeden kısa");
    expect(report).not.toContain("Bulgular");
    // Tek bir son satır sonu; fazladan boş satır yok.
    expect(report.endsWith("\n")).toBe(true);
    expect(report.endsWith("\n\n")).toBe(false);
  });

  it("boş başlık başlık sayılmaz", () => {
    const text = vector("T1").input;
    expect(formatReport(analyze(text), "   ")).toBe(formatReport(analyze(text)));
  });

  it("scores: null ise puan satırları yazılmaz, sayımlar yazılır", () => {
    const report = formatReport(analyze(""));
    expect(report).toBe(
      "okunur\n\nCümle: 0 · Kelime: 0 · Hece: 0\n\nUyarılar\n  ! Metin boş; ölçülecek kelime yok.\n",
    );
    expect(report).not.toContain("Ateşman");
    expect(report).not.toContain("Kelime başına hece");
    expect(report).not.toContain("Bulgular");
  });

  it("uyarı ve bulgu yoksa bölümleri yazmaz", () => {
    expect(formatReport(emptyAnalysis())).toBe("okunur\n\nCümle: 0 · Kelime: 0 · Hece: 0\n");
  });

  it("cümle türü bulguları tırnaksız yazar", () => {
    const longText = `${Array.from({ length: 20 }, () => "kelime").join(" ")}.`;
    const report = formatReport(analyze(longText));
    expect(report).toContain("  1. cümle · Bu cümle 20 kelime. İkiye bölmeyi düşünün.");
    expect(report).toContain("Bulgular (1)");
  });

  it("kelime türü bulguları alıntıyla yazar", () => {
    const report = formatReport(analyze(vector("T2").input));
    expect(report).toContain('  1. cümle · "istinaden": Daha sade karşılık: dayanarak');
  });
});
