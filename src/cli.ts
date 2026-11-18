#!/usr/bin/env node
/**
 * Komut satırı aracı (Bölüm 9).
 *
 * Dosya verilmezse ya da dosya adı "-" ise standart girdiden okur. Çıkış kodları:
 * 0 başarılı, 1 en az bir dosya --min-atesman eşiğinin altında, 2 kullanım ya da
 * dosya okuma hatası.
 */

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { analyze } from "./analyze.js";
import { VERSION } from "./index.js";
import { formatReport, formatScoreLines } from "./report.js";
import type { Analysis, AnalyzeOptions } from "./types.js";

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

const EXIT_OK = 0;
const EXIT_BELOW_THRESHOLD = 1;
const EXIT_USAGE = 2;

/** Analiz edilmiş bir girdi: dosya adı (stdin için "-") ve çözümleme. */
interface AnalyzedFile {
  file: string;
  analysis: Analysis;
}

/** Kullanım ve okuma hataları Türkçe olarak `stderr`'e yazılır (Bölüm 9). */
function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

/** Okuma hatasını Türkçe bir nedene indirger. */
function describeReadError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return "dosya bulunamadı";
    if (code === "EACCES") return "okuma izni yok";
    if (code === "EISDIR") return "yol bir dizin";
    if (code === "ENOTDIR") return "yolun bir parçası dizin değil";
    if (code !== undefined) return `okuma hatası (${code})`;
    return "okuma hatası";
  }
  return "bilinmeyen hata";
}

/** `parseArgs` hatasını Türkçe bir nedene indirger. */
function describeUsageError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
      const option = error.message.match(/'([^']+)'/)?.[1];
      return option === undefined ? "bilinmeyen seçenek" : `bilinmeyen seçenek: ${option}`;
    }
    if (code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE") {
      const option = error.message.match(/Option '([^'\s]+)/)?.[1];
      return option === undefined
        ? "seçenek değeri geçersiz"
        : `seçenek değeri geçersiz: ${option}`;
    }
  }
  return "seçenekler çözümlenemedi";
}

/** Dosyalar UTF-8 okunur; baştaki BOM atılır (Bölüm 9). */
function stripBom(text: string): string {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

/** Standart girdiyi UTF-8 olarak sonuna kadar okur. */
async function readStdinText(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** `--min-atesman` değerini çözer; "49,5" gibi Türkçe ondalık da kabul edilir. */
function parseMinAtesman(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Girdi dosyalarını sırayla okur ve çözümler; hata durumunda `stderr`'e yazar. */
async function readInputs(
  files: string[],
  options: AnalyzeOptions,
): Promise<AnalyzedFile[] | null> {
  const analyzed: AnalyzedFile[] = [];
  const stdinCache: { text: string | null } = { text: null };
  for (const file of files) {
    let text: string;
    if (file === "-") {
      if (stdinCache.text === null) {
        try {
          stdinCache.text = await readStdinText();
        } catch (error) {
          writeError(`Hata: standart girdi okunamadı: ${describeReadError(error)}`);
          return null;
        }
      }
      text = stdinCache.text;
    } else {
      try {
        text = await readFile(file, "utf8");
      } catch (error) {
        writeError(`Hata: "${file}" dosyası okunamadı: ${describeReadError(error)}`);
        return null;
      }
    }
    analyzed.push({ file, analysis: analyze(stripBom(text), options) });
  }
  return analyzed;
}

/** JSON çıktısı: `Analysis` nesnesi + `file` alanı (Bölüm 9). */
function formatJson(analyzed: AnalyzedFile[]): string {
  const results = analyzed.map(({ file, analysis }) => ({ ...analysis, file }));
  const payload = results.length === 1 ? results[0] : results;
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** İnsan okur çıktı; çok dosyada raporlar bir boş satırla ayrılır. */
function formatText(analyzed: AnalyzedFile[], quiet: boolean): string {
  if (quiet) {
    const blocks = analyzed
      .map(({ analysis }) => formatScoreLines(analysis).join("\n"))
      .filter((block) => block !== "");
    return blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
  }
  const blocks = analyzed.map(({ file, analysis }) =>
    formatReport(analysis, file === "-" ? undefined : file),
  );
  return blocks.join("\n");
}

/** Komut satırını çalıştırır ve çıkış kodunu döndürür. */
async function run(argv: string[]): Promise<number> {
  let values: {
    json?: boolean;
    "join-lines"?: boolean;
    "no-suggestions"?: boolean;
    "min-atesman"?: string;
    quiet?: boolean;
    help?: boolean;
    version?: boolean;
  };
  let positionals: string[];
  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        json: { type: "boolean" },
        "join-lines": { type: "boolean" },
        "no-suggestions": { type: "boolean" },
        "min-atesman": { type: "string" },
        quiet: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
    values = parsed.values;
    positionals = parsed.positionals;
  } catch (error) {
    writeError(`Hata: geçersiz kullanım: ${describeUsageError(error)}`);
    writeError('Yardım için "okunur --help" çalıştırın.');
    return EXIT_USAGE;
  }

  if (values.help === true) {
    process.stdout.write(USAGE);
    return EXIT_OK;
  }
  if (values.version === true) {
    process.stdout.write(`okunur ${VERSION}\n`);
    return EXIT_OK;
  }

  let minAtesman: number | null = null;
  if (values["min-atesman"] !== undefined) {
    minAtesman = parseMinAtesman(values["min-atesman"]);
    if (minAtesman === null) {
      writeError("Hata: --min-atesman sayısal bir değer almalı (ör. 50 ya da 49,5).");
      return EXIT_USAGE;
    }
  }

  const options: AnalyzeOptions = {
    joinLines: values["join-lines"] === true,
    suggestions: values["no-suggestions"] !== true,
  };
  const files = positionals.length > 0 ? positionals : ["-"];
  const analyzed = await readInputs(files, options);
  if (analyzed === null) return EXIT_USAGE;

  if (values.json === true) {
    process.stdout.write(formatJson(analyzed));
  } else {
    process.stdout.write(formatText(analyzed, values.quiet === true));
  }

  if (minAtesman !== null) {
    const belowThreshold = analyzed.some(({ analysis }) => {
      const score = analysis.scores?.atesman.score;
      // Puan yoksa (boş metin) eşik karşılaştırması yapılamaz.
      return score !== undefined && score < minAtesman;
    });
    if (belowThreshold) return EXIT_BELOW_THRESHOLD;
  }
  return EXIT_OK;
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  writeError(`Hata: beklenmeyen bir sorun oluştu: ${detail}`);
  process.exitCode = EXIT_USAGE;
}
