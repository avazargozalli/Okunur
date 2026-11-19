/**
 * okunur web — sonuçların DOM'a yazılması (Bölüm 10.2–10.3).
 *
 * Kullanıcı metni asla `innerHTML` ile basılmaz: bütün metinler `textContent` ya da
 * `document.createTextNode` ile kurulur.
 */

import type { Analysis, Issue, IssueType } from "../src/index.js";

export interface FilterState {
  longSentences: boolean;
  longWords: boolean;
  plainAlternatives: boolean;
}

type ScorePrefix = "atesman" | "cetinkaya-uzun" | "bezirci-yilmaz";

interface ScoreLike {
  score: number;
  label: string;
}

interface IssueNode {
  issue: Issue;
  children: IssueNode[];
}

const SCORE_PREFIXES: readonly ScorePrefix[] = ["atesman", "cetinkaya-uzun", "bezirci-yilmaz"];

const COUNT_IDS: readonly string[] = [
  "count-sentences",
  "count-words",
  "count-syllables",
  "count-syllables-per-word",
  "count-words-per-sentence",
  "count-paragraphs",
];

const DISTRIBUTION_KEYS = [1, 2, 3, 4, 5, "6+"] as const;
type DistributionKey = (typeof DISTRIBUTION_KEYS)[number];

const MARK_CLASSES: Readonly<Record<IssueType, string>> = {
  "long-sentence": "mark-long-sentence",
  "very-long-sentence": "mark-very-long-sentence",
  "long-word": "mark-long-word",
  "plain-alternative": "mark-plain-alternative",
};

/** Aynı `start` değerinde dıştaki işaret önce gelsin diye tür önceliği. */
const TYPE_ORDER: Readonly<Record<IssueType, number>> = {
  "long-sentence": 0,
  "very-long-sentence": 0,
  "long-word": 1,
  "plain-alternative": 2,
};

let flashTimer: number | undefined;

function byId<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error(`#${id} bulunamadı`);
  }
  return found as T;
}

function formatDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

function setSummary(text: string): void {
  const summary = byId("result-summary");
  if (summary.textContent !== text) {
    summary.textContent = text;
  }
}

function setScore(prefix: ScorePrefix, score: ScoreLike | null | undefined): void {
  const scoreElement = byId(`${prefix}-score`);
  const levelElement = byId(`${prefix}-level`);
  if (score === null || score === undefined) {
    scoreElement.textContent = "—";
    levelElement.textContent = "Düzey belirlenemedi";
    return;
  }
  scoreElement.textContent = formatDecimal(score.score, 1);
  levelElement.textContent = score.label;
}

function distributionDomId(key: DistributionKey): string {
  return key === "6+" ? "6" : String(key);
}

function isEnabled(type: IssueType, filters: FilterState): boolean {
  if (type === "long-sentence" || type === "very-long-sentence") {
    return filters.longSentences;
  }
  if (type === "long-word") {
    return filters.longWords;
  }
  return filters.plainAlternatives;
}

function sortIssues(issues: readonly Issue[]): Issue[] {
  return [...issues].sort(
    (left, right) =>
      left.start - right.start ||
      right.end - left.end ||
      TYPE_ORDER[left.type] - TYPE_ORDER[right.type],
  );
}

/**
 * Aralıkları iç içe bir ağaca çevirir. Cümle bulguları kelime bulgularını sarar;
 * aynı aralığa düşen iki bulgu da iç içe gösterilir.
 */
function buildIssueTree(issues: readonly Issue[]): IssueNode[] {
  const roots: IssueNode[] = [];
  const stack: IssueNode[] = [];

  for (const issue of sortIssues(issues)) {
    const node: IssueNode = { issue, children: [] };
    let parent = stack.at(-1);

    while (parent !== undefined && issue.start >= parent.issue.end) {
      stack.pop();
      parent = stack.at(-1);
    }
    while (
      parent !== undefined &&
      !(issue.start >= parent.issue.start && issue.end <= parent.issue.end)
    ) {
      stack.pop();
      parent = stack.at(-1);
    }

    if (parent === undefined) {
      roots.push(node);
    } else {
      parent.children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

function renderIssueNodes(
  parent: HTMLElement,
  nodes: readonly IssueNode[],
  start: number,
  end: number,
  text: string,
  markByIssue: Map<Issue, HTMLElement>,
): void {
  let cursor = start;

  for (const node of nodes) {
    const nodeStart = Math.max(node.issue.start, start, cursor);
    const nodeEnd = Math.min(node.issue.end, end);
    if (nodeEnd <= nodeStart) continue;

    if (nodeStart > cursor) {
      parent.append(document.createTextNode(text.slice(cursor, nodeStart)));
    }

    const mark = document.createElement("mark");
    mark.className = MARK_CLASSES[node.issue.type];
    mark.tabIndex = 0;
    mark.title = node.issue.message;
    mark.setAttribute("aria-label", node.issue.message);
    markByIssue.set(node.issue, mark);

    renderIssueNodes(mark, node.children, nodeStart, nodeEnd, text, markByIssue);
    parent.append(mark);
    cursor = nodeEnd;
  }

  if (cursor < end) {
    parent.append(document.createTextNode(text.slice(cursor, end)));
  }
}

function revealIssue(issue: Issue, markByIssue: ReadonlyMap<Issue, HTMLElement>): void {
  const mark = markByIssue.get(issue);
  if (mark === undefined) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  mark.focus({ preventScroll: true });
  mark.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "center",
  });

  for (const highlighted of document.querySelectorAll(".mark-vurgu")) {
    highlighted.classList.remove("mark-vurgu");
  }
  mark.classList.add("mark-vurgu");

  if (flashTimer !== undefined) {
    window.clearTimeout(flashTimer);
  }
  flashTimer = window.setTimeout(() => {
    mark.classList.remove("mark-vurgu");
    flashTimer = undefined;
  }, 1600);
}

function renderIssueList(
  issues: readonly Issue[],
  markByIssue: ReadonlyMap<Issue, HTMLElement>,
): void {
  const section = byId("issues-section");
  const count = byId("issue-count");
  const list = byId<HTMLOListElement>("issue-list");
  list.replaceChildren();

  if (issues.length === 0) {
    count.textContent = "";
    section.hidden = true;
    return;
  }

  section.hidden = false;
  count.textContent = `(${issues.length})`;

  for (const issue of issues) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "issue";

    const meta = document.createElement("span");
    meta.className = "issue-meta";
    meta.append(document.createTextNode(`${issue.sentence + 1}. cümle`));

    const quote = document.createElement("span");
    quote.className = "issue-quote";
    quote.textContent = `"${issue.text}"`;
    meta.append(document.createTextNode(" · "), quote);

    const message = document.createElement("span");
    message.className = "issue-message";
    message.textContent = issue.message;

    button.append(meta, message);
    button.addEventListener("click", () => {
      revealIssue(issue, markByIssue);
    });

    item.append(button);
    list.append(item);
  }
}

/** Puanları, sayımları, dağılımı, uyarıları ve özet satırını yazar. */
export function renderResults(analysis: Analysis): void {
  byId("empty-state").hidden = true;
  byId("results-content").hidden = false;
  setCopyStatus("");

  const summary =
    analysis.scores === null
      ? "Puan hesaplanamadı: metinde kelime yok."
      : `Ateşman ${formatDecimal(analysis.scores.atesman.score, 1)}: ${analysis.scores.atesman.label}`;
  setSummary(summary);

  setScore("atesman", analysis.scores?.atesman);
  setScore("cetinkaya-uzun", analysis.scores?.cetinkayaUzun);
  setScore("bezirci-yilmaz", analysis.scores?.bezirciYilmaz);

  const { counts, averages } = analysis;
  byId("count-sentences").textContent = String(counts.sentences);
  byId("count-words").textContent = String(counts.words);
  byId("count-syllables").textContent = String(counts.syllables);
  byId("count-syllables-per-word").textContent =
    averages === null ? "—" : formatDecimal(averages.syllablesPerWord, 2);
  byId("count-words-per-sentence").textContent =
    averages === null ? "—" : formatDecimal(averages.wordsPerSentence, 2);
  byId("count-paragraphs").textContent = String(counts.paragraphs);

  const maxCount = Math.max(
    1,
    ...DISTRIBUTION_KEYS.map((key) => analysis.syllableDistribution[key]),
  );
  for (const key of DISTRIBUTION_KEYS) {
    const domId = distributionDomId(key);
    const count = analysis.syllableDistribution[key];
    byId(`dist-${domId}-count`).textContent = String(count);
    byId(`dist-${domId}-bar`).style.width = `${((count / maxCount) * 100).toFixed(2)}%`;
  }

  const warningsSection = byId("warnings-section");
  const warningsList = byId("warnings-list");
  warningsList.replaceChildren();
  for (const warning of analysis.warnings) {
    const item = document.createElement("li");
    item.textContent = warning.message;
    warningsList.append(item);
  }
  warningsSection.hidden = analysis.warnings.length === 0;
}

/** İşaretli metni kurar; süzgeçler yalnızca işaretlerin görünürlüğünü değiştirir. */
export function renderMarksAndIssues(analysis: Analysis, filters: FilterState): void {
  const markedText = byId("marked-text");
  const markByIssue = new Map<Issue, HTMLElement>();

  if (flashTimer !== undefined) {
    window.clearTimeout(flashTimer);
    flashTimer = undefined;
  }
  markedText.replaceChildren();

  const tree = buildIssueTree(analysis.issues);
  renderIssueNodes(
    markedText,
    tree,
    0,
    analysis.normalizedText.length,
    analysis.normalizedText,
    markByIssue,
  );
  applyFilters(markedText, markByIssue, filters);
  renderIssueList(analysis.issues, markByIssue);
}

/**
 * Süzülmüş türleri görsel olarak gizler: işaret metni yerinde kalır ama arka planı,
 * kenarlığı ve alt çizgisi kaldırılır; klavye sırasından çıkar ve etiketsiz kalır.
 * Bulgu listesi tam kalır; böylece gizli türdeki bir bulguya tıklanınca işaret
 * yine bulunup kısa süre vurgulanabilir.
 */
function applyFilters(
  markedText: HTMLElement,
  markByIssue: ReadonlyMap<Issue, HTMLElement>,
  filters: FilterState,
): void {
  markedText.classList.toggle("is-hiding-sentences", !filters.longSentences);
  markedText.classList.toggle("is-hiding-long-words", !filters.longWords);
  markedText.classList.toggle("is-hiding-plain-alternatives", !filters.plainAlternatives);

  for (const [issue, mark] of markByIssue) {
    const enabled = isEnabled(issue.type, filters);
    mark.tabIndex = enabled ? 0 : -1;
    if (enabled) {
      mark.title = issue.message;
      mark.setAttribute("aria-label", issue.message);
    } else {
      mark.removeAttribute("title");
      mark.removeAttribute("aria-label");
      if (document.activeElement === mark) mark.blur();
    }
  }
}

/** Metin boşken sonuç sütununu başlangıç durumuna döndürür. */
export function resetResults(): void {
  if (flashTimer !== undefined) {
    window.clearTimeout(flashTimer);
    flashTimer = undefined;
  }

  byId("results-content").hidden = true;
  byId("empty-state").hidden = false;
  setSummary("");
  setCopyStatus("");

  for (const prefix of SCORE_PREFIXES) {
    byId(`${prefix}-score`).textContent = "—";
    byId(`${prefix}-level`).textContent = "";
  }
  for (const id of COUNT_IDS) {
    byId(id).textContent = "—";
  }
  for (const key of DISTRIBUTION_KEYS) {
    const domId = distributionDomId(key);
    byId(`dist-${domId}-count`).textContent = "—";
    byId(`dist-${domId}-bar`).style.width = "0%";
  }

  byId("warnings-list").replaceChildren();
  byId("warnings-section").hidden = true;
  byId("issue-list").replaceChildren();
  byId("issue-count").textContent = "";
  byId("issues-section").hidden = true;
  byId("marked-text").replaceChildren();
}

export function setCopyStatus(message: string): void {
  byId("copy-status").textContent = message;
}

export function setVersion(version: string, algorithmVersion: number): void {
  byId("app-version").textContent = version;
  byId("algorithm-version").textContent = String(algorithmVersion);
}
