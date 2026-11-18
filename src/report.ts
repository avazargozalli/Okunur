/**
 * Düz metin rapor (Bölüm 8 ve 9). CLI ile web'in "raporu kopyala" düğmesi aynı
 * işlevi kullanır.
 *
 * Biçim kuralları: renk yok; sayılar Türkçe (ondalık ayırıcı virgül); puanlar bir
 * ondalık, ortalamalar iki ondalık basamak.
 */

import type { Analysis, Issue } from "./types.js";

/** Formül adı sütununun genişliği (sola yaslı). */
const NAME_WIDTH = 18;

/** Puan sütununun genişliği (sağa yaslı). */
const SCORE_WIDTH = 4;

/** Sayıyı sabit basamakla ve Türkçe ondalık virgülle biçimlendirir. */
function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/** Tek puan satırı: ad sola, puan sağa yaslı; iki boşluk; düzey etiketi. */
function formatScoreLine(name: string, score: number, label: string): string {
  const nameColumn = name.padEnd(NAME_WIDTH);
  const scoreColumn = formatNumber(score, 1).padStart(SCORE_WIDTH);
  return `${nameColumn}${scoreColumn}  ${label}`;
}

/**
 * Üç puan satırı. `scores: null` ise (ölçülecek kelime/cümle yok) boş dizi döner.
 * `--quiet` bu diziyi kullanır; genel API'ye dışa aktarılmaz.
 */
export function formatScoreLines(analysis: Analysis): string[] {
  if (analysis.scores === null) return [];
  const { atesman, cetinkayaUzun, bezirciYilmaz } = analysis.scores;
  return [
    formatScoreLine("Ateşman", atesman.score, atesman.label),
    formatScoreLine("Çetinkaya-Uzun", cetinkayaUzun.score, cetinkayaUzun.label),
    formatScoreLine("Bezirci-Yılmaz", bezirciYilmaz.score, bezirciYilmaz.label),
  ];
}

/** Cümle türü bulgular ile kelime türü bulgular farklı biçimde yazılır (Bölüm 9). */
function isSentenceIssue(issue: Issue): boolean {
  return issue.type === "long-sentence" || issue.type === "very-long-sentence";
}

/** Bir bulgu satırı; cümle numarası 1'den başlar (Bölüm 9). */
function formatIssue(issue: Issue): string {
  const prefix = `  ${issue.sentence + 1}. cümle · `;
  if (isSentenceIssue(issue)) return `${prefix}${issue.message}`;
  return `${prefix}"${issue.text}": ${issue.message}`;
}

/**
 * `Analysis` nesnesinden düz metin rapor üretir (Bölüm 8 ve 9).
 *
 * Başlık verilmezse ilk satır yalnızca `okunur` olur; verilirse `okunur — {title}`.
 * Boş ya da yalnızca boşluktan oluşan başlık verilmemiş sayılır.
 *
 * `scores: null` durumunda üç puan satırı yazılmaz; sayımlar yazılır. Uyarı yoksa
 * "Uyarılar", bulgu yoksa "Bulgular" bölümü hiç yazılmaz. Dönen dize tek bir son
 * satır sonuyla biter; CLI bu dizeyi doğrudan yazar.
 */
export function formatReport(analysis: Analysis, title?: string): string {
  const hasTitle = typeof title === "string" && title.trim() !== "";
  const lines: string[] = [hasTitle ? `okunur — ${title}` : "okunur", ""];
  const scoreLines = formatScoreLines(analysis);
  if (scoreLines.length > 0) {
    lines.push(...scoreLines, "");
  }
  const { counts, averages } = analysis;
  lines.push(`Cümle: ${counts.sentences} · Kelime: ${counts.words} · Hece: ${counts.syllables}`);
  if (averages !== null) {
    const perWord = formatNumber(averages.syllablesPerWord, 2);
    const perSentence = formatNumber(averages.wordsPerSentence, 2);
    lines.push(`Kelime başına hece: ${perWord} · Cümle başına kelime: ${perSentence}`);
  }
  if (analysis.warnings.length > 0) {
    lines.push("", "Uyarılar", ...analysis.warnings.map((warning) => `  ! ${warning.message}`));
  }
  if (analysis.issues.length > 0) {
    lines.push(
      "",
      `Bulgular (${analysis.issues.length})`,
      ...analysis.issues.map((issue) => formatIssue(issue)),
    );
  }
  return `${lines.join("\n")}\n`;
}
