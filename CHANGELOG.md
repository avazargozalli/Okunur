# Değişiklik Günlüğü

Bu proje [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) biçimini ve [Semantic Versioning](https://semver.org/lang/tr/) ilkelerini kullanır. Sürüm numarası `MAJOR.MINOR.PATCH` biçimindedir; `ALGORITHM_VERSION` değişikliği her zaman en az bir **minor** sürüm artışıdır.

## [Yayımlanmadı]

## [0.1.0] - 2026-11-19

İlk sürüm.

### Eklendi

- TypeScript ile yazılmış, çalışma zamanı bağımlılığı olmayan çekirdek kütüphane; ESM ve tip tanımları.
- Üç okunabilirlik formülü: Ateşman (1997), Çetinkaya-Uzun (2010), Bezirci-Yılmaz (2010).
- Temel sayımlar: karakter, harf, kelime, cümle, hece, paragraf; hece dağılımı ve ortalamalar.
- Türkçeye özgü normalizasyon ve bölütleme: İ/ı dönüşümü, kısaltmalar, sıra sayıları, sayıların okunuşu, birimler, kesme işaretli ekler, URL ve e-posta yok sayma.
- Tanılama: uzun cümle, çok uzun cümle, uzun kelime ve sade karşılık önerileri.
- Komut satırı aracı: insan okur rapor, `--json`, `--join-lines`, `--no-suggestions`, `--min-atesman`, `--quiet`, stdin ve 0/1/2 çıkış kodları.
- Statik web uygulaması: metin tarayıcıdan çıkmaz; işaretli metin, bulgu süzgeçleri, rapor kopyalama ve JSON indirme.
- Ek B'deki test vektörlerini kullanan birim ve uçtan uca testler; konum tutarlılığı ve determinizm denetimleri.
- Yöntem ve kararlar belgeleri; README (Türkçe ve İngilizce özet), katkı rehberi, davranış kuralları, güvenlik politikası, atıf künyesi ve MIT lisansı.
- GitHub Actions ile CI, GitHub Pages ve npm sürüm yayını iş akışları; issue ve PR şablonları.

### Algoritma

- `ALGORITHM_VERSION = 1` ile ilk algoritma sürümü yayımlandı.
- Ek B'deki `numbers.json`, `syllables.json`, `sentences.json`, `texts.json` ve `formulas.json` vektörleri normatif kabul edildi.
- Bezirci-Yılmaz düzey sınırları `≤ 8`, `≤ 12`, `≤ 16`, `> 16` olarak belirlendi; gerekçe `docs/kararlar.md` içinde.

[Yayımlanmadı]: https://github.com/{GITHUB_KULLANICI}/okunur/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/{GITHUB_KULLANICI}/okunur/releases/tag/v0.1.0
