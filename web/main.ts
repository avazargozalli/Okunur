/**
 * okunur web — giriş olayları, analiz akışı ve dışa aktarma (Bölüm 10.3).
 *
 * Metin yalnızca tarayıcıda işlenir; ağa gönderilmez ve depolanmaz. localStorage'da
 * yalnızca onay kutusu/süzgeç tercihleri tutulur.
 */

import type { Analysis, AnalyzeOptions } from "../src/index.js";
import { ALGORITHM_VERSION, analyze, formatReport, VERSION } from "../src/index.js";
import type { FilterState } from "./render.js";
import {
  renderMarksAndIssues,
  renderResults,
  resetResults,
  setCopyStatus,
  setVersion,
} from "./render.js";
import { sampleText } from "./sample.js";

const DEBOUNCE_MS = 200;
const PREFERENCES_KEY = "okunur:preferences:v1";

const THRESHOLDS: NonNullable<AnalyzeOptions["thresholds"]> = {
  longSentence: 20,
  veryLongSentence: 30,
  longWord: 6,
};

interface Preferences extends FilterState {
  joinLines: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  joinLines: false,
  longSentences: true,
  longWords: true,
  plainAlternatives: true,
};

function byId<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error(`#${id} bulunamadı`);
  }
  return found as T;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function loadPreferences(): Preferences {
  try {
    const stored = window.localStorage.getItem(PREFERENCES_KEY);
    if (stored === null) return { ...DEFAULT_PREFERENCES };
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_PREFERENCES };
    }
    const record = parsed as Record<string, unknown>;
    return {
      joinLines: booleanOr(record.joinLines, DEFAULT_PREFERENCES.joinLines),
      longSentences: booleanOr(record.longSentences, DEFAULT_PREFERENCES.longSentences),
      longWords: booleanOr(record.longWords, DEFAULT_PREFERENCES.longWords),
      plainAlternatives: booleanOr(record.plainAlternatives, DEFAULT_PREFERENCES.plainAlternatives),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

const textInput = byId<HTMLTextAreaElement>("text-input");
const joinLinesInput = byId<HTMLInputElement>("join-lines");
const longSentencesInput = byId<HTMLInputElement>("filter-long-sentences");
const longWordsInput = byId<HTMLInputElement>("filter-long-words");
const plainAlternativesInput = byId<HTMLInputElement>("filter-plain-alternatives");
const loadSampleButton = byId<HTMLButtonElement>("load-sample");
const clearButton = byId<HTMLButtonElement>("clear-text");
const copyButton = byId<HTMLButtonElement>("copy-report");
const downloadButton = byId<HTMLButtonElement>("download-json");

let currentAnalysis: Analysis | null = null;
let analysisTimer: number | undefined;
let statusTimer: number | undefined;
let preferences: Preferences = { ...DEFAULT_PREFERENCES };

function currentFilters(): FilterState {
  return {
    longSentences: longSentencesInput.checked,
    longWords: longWordsInput.checked,
    plainAlternatives: plainAlternativesInput.checked,
  };
}

function syncPreferencesFromForm(): void {
  preferences = {
    joinLines: joinLinesInput.checked,
    ...currentFilters(),
  };
}

function savePreferences(): void {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Depolama reddedildiyse tercihler yalnızca bu oturumda geçerli olur.
  }
}

function applyPreferences(): void {
  joinLinesInput.checked = preferences.joinLines;
  longSentencesInput.checked = preferences.longSentences;
  longWordsInput.checked = preferences.longWords;
  plainAlternativesInput.checked = preferences.plainAlternatives;
}

function showStatus(message: string): void {
  setCopyStatus(message);
  if (statusTimer !== undefined) {
    window.clearTimeout(statusTimer);
  }
  statusTimer = window.setTimeout(() => {
    setCopyStatus("");
    statusTimer = undefined;
  }, 4000);
}

function analyzeOptions(): AnalyzeOptions {
  return {
    joinLines: joinLinesInput.checked,
    suggestions: true,
    thresholds: THRESHOLDS,
  };
}

function cancelPendingAnalysis(): void {
  if (analysisTimer !== undefined) {
    window.clearTimeout(analysisTimer);
    analysisTimer = undefined;
  }
}

function runAnalysis(): void {
  cancelPendingAnalysis();
  const text = textInput.value;
  if (text.trim() === "") {
    currentAnalysis = null;
    resetResults();
    return;
  }

  try {
    const analysis = analyze(text, analyzeOptions());
    currentAnalysis = analysis;
    renderResults(analysis);
    renderMarksAndIssues(analysis, currentFilters());
  } catch {
    currentAnalysis = null;
    resetResults();
    showStatus("Analiz yapılamadı.");
  }
}

function scheduleAnalysis(): void {
  cancelPendingAnalysis();
  analysisTimer = window.setTimeout(() => {
    analysisTimer = undefined;
    runAnalysis();
  }, DEBOUNCE_MS);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard !== undefined) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Pano API'si reddederse seçim tabanlı yedeğe düşülür.
  }
  return copyTextWithSelection(text);
}

function copyTextWithSelection(text: string): boolean {
  const previousFocus = document.activeElement;
  const helper = document.createElement("textarea");
  helper.className = "clipboard-helper";
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.setAttribute("aria-hidden", "true");
  helper.tabIndex = -1;
  document.body.append(helper);

  helper.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  helper.remove();
  if (previousFocus instanceof HTMLElement) {
    previousFocus.focus({ preventScroll: true });
  }
  return copied;
}

async function copyReport(): Promise<void> {
  if (currentAnalysis === null) return;
  const copied = await copyText(formatReport(currentAnalysis));
  showStatus(
    copied ? "Rapor panoya kopyalandı." : "Rapor kopyalanamadı; tarayıcı izinlerini kontrol edin.",
  );
}

function downloadJson(): void {
  if (currentAnalysis === null) return;
  const content = JSON.stringify(currentAnalysis, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "okunur-sonuc.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function wireEvents(): void {
  textInput.addEventListener("input", () => {
    if (textInput.value.trim() === "") {
      cancelPendingAnalysis();
      currentAnalysis = null;
      resetResults();
      return;
    }
    scheduleAnalysis();
  });

  loadSampleButton.addEventListener("click", () => {
    cancelPendingAnalysis();
    textInput.value = sampleText;
    textInput.focus();
    textInput.setSelectionRange(sampleText.length, sampleText.length);
    runAnalysis();
  });

  clearButton.addEventListener("click", () => {
    cancelPendingAnalysis();
    currentAnalysis = null;
    textInput.value = "";
    resetResults();
    textInput.focus();
  });

  joinLinesInput.addEventListener("change", () => {
    syncPreferencesFromForm();
    savePreferences();
    if (textInput.value.trim() !== "") {
      runAnalysis();
    }
  });

  for (const checkbox of [longSentencesInput, longWordsInput, plainAlternativesInput]) {
    checkbox.addEventListener("change", () => {
      syncPreferencesFromForm();
      savePreferences();
      if (currentAnalysis !== null) {
        renderMarksAndIssues(currentAnalysis, currentFilters());
      }
    });
  }

  copyButton.addEventListener("click", () => {
    void copyReport();
  });

  downloadButton.addEventListener("click", downloadJson);
}

function initialize(): void {
  preferences = loadPreferences();
  applyPreferences();
  setVersion(VERSION, ALGORITHM_VERSION);
  wireEvents();

  if (textInput.value.trim() === "") {
    resetResults();
  } else {
    runAnalysis();
  }
}

initialize();
