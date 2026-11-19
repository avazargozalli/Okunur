# okunur

`okunur` — a readability analyzer for Turkish texts. It computes **Ateşman (1997)**, **Çetinkaya-Uzun (2010)** and **Bezirci-Yılmaz (2010)** scores, basic counts, and sentence-level plain-language suggestions.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/okunur.svg)](https://www.npmjs.com/package/okunur)
[![CI](https://github.com/avazargozalli/Okunur/actions/workflows/ci.yml/badge.svg)](https://github.com/avazargozalli/Okunur/actions/workflows/ci.yml)

[Web app](https://avazargozalli.github.io/Okunur/) · [Turkish README](README.md)

`okunur` is deterministic: it uses no network, no model, and no external dictionary. It is designed for Turkish and does not support other languages.

## Install

```bash
npm install okunur
```

## Usage

```ts
import { analyze } from "okunur";

const { counts, scores } = analyze("Kedi süt içti. Sonra uyudu.");
console.log(counts);
console.log(scores?.atesman);
```

From the command line:

```bash
npx okunur dosya.txt
npx okunur --min-atesman 50 belge.txt   # exit code 1 below the threshold
```

## How scores are read

Higher Ateşman and Çetinkaya-Uzun scores mean easier texts. Higher Bezirci-Yılmaz values mean harder texts.

| Ateşman | Level     | Çetinkaya-Uzun | Level                      | Bezirci-Yılmaz | Level          |
| ------- | --------- | -------------- | -------------------------- | -------------- | -------------- |
| ≥ 90    | Very easy | ≥ 51           | Independent (grades 5–7)   | ≤ 8            | Primary school |
| ≥ 70    | Easy      | ≥ 35           | Instructional (grades 8–9) | ≤ 12           | High school    |
| ≥ 50    | Moderate  | < 35           | Frustration (grades 10–12) | ≤ 16           | Undergraduate  |
| ≥ 30    | Hard      |                |                            | > 16           | Academic       |
| < 30    | Very hard |                |                            |                |                |

The full method, normalization rules, tables, formulas, and limitations are documented in Turkish: [docs/yontem.md](docs/yontem.md). Known limitations are listed in [README.md](README.md#sınırlar) and [docs/kararlar.md](docs/kararlar.md).

## Formula sources

- Ateşman, E. (1997). Türkçede okunabilirliğin ölçülmesi. _Dil Dergisi_, 58, 71–74.
- Bezirci, B. & Yılmaz, A. E. (2010). Metinlerin okunabilirliğinin ölçülmesi üzerine bir yazılım kütüphanesi ve Türkçe için yeni bir okunabilirlik ölçütü. _Dokuz Eylül Üniversitesi Mühendislik Fakültesi Fen ve Mühendislik Dergisi_, 12(3), 49–62.
- Çetinkaya, G. (2010). _Türkçe metinlerin okunabilirlik düzeylerinin tanımlanması ve sınıflandırılması_ (Doctoral dissertation). Ankara Üniversitesi.
- Flesch, R. (1948). A new readability yardstick. _Journal of Applied Psychology_, 32(3), 221–233.

## Citation and license

Citation metadata is in [CITATION.cff](CITATION.cff). Licensed under the MIT License; see [LICENSE](LICENSE).

---

This file is a short English summary; see the Turkish [README.md](README.md) for details.
