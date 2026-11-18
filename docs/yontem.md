# okunur — Yöntem

**Yazılım sürümü:** 0.1.0 · **Algoritma sürümü:** 1 · **Belge tarihi:** 2026-11-19

`okunur`, Türkçe bir metnin okunabilirliğini ölçen deterministik bir araçtır. Bu belge, aracın uyguladığı yöntemi —normalizasyondan tanılamaya kadar— okur dostu bir dille ve örneklerle açıklar; akademik bir yöntem bölümünde atıf yapılabilecek ayrıntıyı verir. Bağlayıcı kaynak proje şartnamesidir; bu belge ile şartname arasında bir çelişki olursa şartname ve test vektörleri geçerlidir.

Yöntemin tamamı tek bir algoritma sürümüne bağlıdır: `ALGORITHM_VERSION = 1`. Çıktıyı değiştiren her düzenleme algoritma sürümünün artırılmasını gerektirir; bu, aynı metnin farklı sürümlerde neden farklı puan alabileceğini açıklar.

## 1. Kapsam ve temel sözleşme

- Girdi, UTF-8 düz metindir; basit Markdown işaretleri (başlık, liste, alıntı) kabul edilir. PDF/DOCX okuma, görsel ya da tablo çözümleme yoktur.
- `analyze` saf bir işlevdir: genel durum, tarih, rastgelelik, ağ, dosya sistemi kullanmaz. Aynı girdi ve aynı seçenekler her ortamda aynı sonucu verir.
- Bütün konumlar (`start`, `end`) **normalize edilmiş metin** (`normalizedText`) üzerindeki UTF-16 kod birimi indeksleridir; `end` hariçtir. Arayüz işaretlemeyi her zaman normalize metin üzerinden yapar.
- Boş metin ya da yalnızca boşluk içeren metin istisna fırlatmaz; sıfır sayımlı bir sonuç ve `empty` uyarısı üretir. Dize olmayan girdi `TypeError` fırlatır.

İşlem sırası:

```text
girdi metni
  → normalizasyon (2)                            → normalizedText
  → (joinLines ise) tek satır sonlarını boşluğa çevir
  → satırlara/bloklara böl, baştaki işaretleri atla (4.1)
  → her blokta belirteçleri çıkar, cümle sınırlarını bul (4.2)
  → her cümlede kelimeleri çıkar (4.3)
  → her kelimenin hecesini say (5, 6)
  → kelimesi olmayan cümleleri at
  → sayımlar, formüller, düzeyler (8)
  → tanılama (9)
```

## 2. Normalizasyon

Normalizasyon, aynı metnin farklı kopyalarının (ör. farklı işletim sistemlerinden, PDF'ten ya da kelime işlemciden) aynı sonucu vermesini sağlar. Adımlar sırayla uygulanır:

| #   | İşlem                                                                              |
| --- | ---------------------------------------------------------------------------------- |
| N1  | Unicode NFC normalizasyonu                                                         |
| N2  | `\r\n` ve `\r` → `\n`                                                              |
| N3  | Şu görünmez karakterleri sil: U+00AD (yumuşak tire), U+200B–U+200D, U+2060, U+FEFF |
| N4  | Sekme, U+00A0, U+2000–U+200A, U+202F, U+3000 → normal boşluk                       |
| N5  | Şu karakterler → `'`: U+2018, U+2019, U+02BC, U+0060, U+00B4                       |
| N6  | `…` (U+2026) → `...`                                                               |
| N7  | `²` → `2`, `³` → `3`                                                               |
| N8  | Eksik boşluk onarımı: `(\p{Ll}{2})([.!?])(\p{Lu}\p{Ll})` → `$1$2 $3`               |

N8'in amacı, bitişik yazılmış iki cümleyi ayırmaktır: `Geldi.Sonra` → `Geldi. Sonra`. Kural, noktalamadan hemen önce en az iki küçük harf ve hemen sonra büyük harf + küçük harf geldiğinde çalışır; bu yüzden `3.14` gibi sayıları etkilemez.

**`joinLines` seçeneği.** PDF'ten kopyalanan metinlerde satır sonları cümlenin ortasına düşebilir. `joinLines: true` ise normalizasyondan sonra, ardından boş satır gelmeyen her tekil `\n` bir boşluğa çevrilir:

```text
([^\n])\n(?!\n)  →  $1
```

Böylece paragraf sınırları (çift satır sonu) korunur, ama satır ortası kırılmaları birleşir. Bu seçenek kapalıyken her satır ayrı bir bloktur.

Normalizasyon metni küçük harfe çevirmez, noktalama işaretlerini silmez ve kelimelere ayırmaz; yalnızca biçim farklarını giderir. Bu nedenle cümle ve kelime konumları normalize metne göre hesaplanır.

## 3. Türkçe harf işlemleri

Türkçede büyük/küçük harf dönüşümü, `I`/`İ` ve `i`/`ı` çiftleri yüzünden dile özgüdür. `okunur` bu iş için kendi `lowerTr` işlevini kullanır:

```ts
lowerTr(s) = s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
```

`String.prototype.toLocaleLowerCase("tr")` **kullanılmaz**, çünkü sonucu ortamın ICU verisine bağlıdır ve deterministik olmayabilir.

**Ünlüler.** Küçük harfli ünlü kümesi şudur:

```text
a e ı i o ö u ü â î û ê ô á à ä ã å é è ë í ì ï ó ò õ ú ù
```

`countVowels(s)`, `lowerTr(s)` içindeki ünlülerin sayısıdır. Hece sayımının temelinde bu işlev vardır.

**Büyük/küçük harf başlangıcı.** `startsUpper(tok)`, belirteçteki ilk harf-ya-da-rakam karakteri büyük harfse doğrudur; `startsLower(tok)` aynı karakter küçük harfse doğrudur. İlk karakter rakamsa ikisi de yanlıştır. Bu ayrım, cümle sınırı ve kısaltma kurallarında kullanılır.

## 4. Bloklar, cümleler ve kelimeler

### 4.1 Bloklar

Metin `\n` ile satırlara bölünür. Yalnızca boşluk içeren satırlar atlanır; kalan her satır bir **blok**tur. `counts.paragraphs` bu blokların sayısıdır. Bir blok, sonunda noktalama olmasa bile bir cümle sınırıdır: başlıklar ve liste maddeleri bu yüzden cümle sayılır.

Blok başındaki şu işaretler **tekrar tekrar** atlanır; atlanan işaretler kelime sayılmaz ve cümlenin `start` konumu işaretten sonra başlar:

```text
^\s*(?:#{1,6}\s+|>\s+|[-*•–—]\s+|\d{1,3}\)\s+|\d{1,3}\.\s+(?!\p{Ll})|\p{L}\)\s+)
```

Buradaki `(?!\p{Ll})` koşulu önemlidir:

- `1. Giriş` → `1.` atılır (ardından büyük harf geliyor; liste/başlık işareti).
- `3. madde yürürlükten kalktı` → `3.` atılmaz (ardından küçük harf geliyor; sıra sayısıdır).

### 4.2 Belirteçler ve cümle sınırı

Blok, boşluk olmayan karakter dizilerine (`\S+`) bölünür; her biri bir **belirteç**tir. Bir belirtecin cümleyi bitirip bitirmediği, sonunun şu kalıpla incelenmesiyle belirlenir:

```text
([.!?]+)(["'”’»)\]}]*)$
```

Buradan üç parça çıkar: `run` (noktalama dizisi), `closers` (kapanış işaretleri) ve `before` (öncesi). `next`, aynı bloktaki sonraki belirteçtir. Karar sırası:

| #   | Koşul                                                                                                                   | Sonuç                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| S1  | Kalıp eşleşmiyor                                                                                                        | Bitirmez (blokun son belirteciyse bitirir)                                  |
| S2  | `next` yok (blok sonu)                                                                                                  | **Bitirir**                                                                 |
| S3  | `closers` içinde tırnak (`" ' ” ’ »`) var ve `startsLower(next)`                                                        | Bitirmez (ör. `"Geliyor musun?" dedi.`)                                     |
| S4  | `run` içinde `!` ya da `?` var, `before` `(` ile bitiyor ve `closers` `)` ile başlıyor                                  | Bitirmez (`(!)`, `(?)`)                                                     |
| S5  | `run` içinde `!` ya da `?` var                                                                                          | **Bitirir**                                                                 |
| S6  | `run` iki ya da daha çok nokta (üç nokta)                                                                               | `startsUpper(next)` ise bitirir, değilse bitirmez                           |
| S7  | Tek nokta; `body` = `before`'un baş ve sonundaki harf/rakam/`% ₺ $ € £ &` olmayan karakterleri atılmış hali; `body` boş | **Bitirir**                                                                 |
| S8  | `lowerTr(body) + "."` kısaltma tablosunda (7.1) ve (girdi `yalnızBüyük` değilse ya da `body` büyük harfle başlıyorsa)   | Sınıf `son` ise: `startsUpper(next)` ise bitirir. Sınıf `bas` ise: bitirmez |
| S9  | `body` noktalı baş harf dizisi: `^(\p{L}\.)+\p{L}$` (ör. `A.B.D`)                                                       | Bitirmez                                                                    |
| S10 | `body` tek harf: `^\p{L}$` (ör. `A. Yılmaz`, `s. 45`)                                                                   | Bitirmez                                                                    |
| S11 | `body` Romen rakamı: `^[IVX]{2,}$`                                                                                      | Bitirmez; belirteç **sıra sayısı** olarak işaretlenir                       |
| S12 | `body` sayısal: `^\d[\d.,:\/]*$` ve 1–2 basamaklı tam sayı (`^\d{1,2}$`)                                                | Bitirmez; **sıra sayısı**                                                   |
| S13 | `body` sayısal (diğer) ve `startsLower(next)`                                                                           | Bitirmez; **sıra sayısı**                                                   |
| S14 | `body` sayısal (diğer)                                                                                                  | **Bitirir**                                                                 |
| S15 | Diğer her durum                                                                                                         | **Bitirir**                                                                 |

`yalnızBüyük`, kısaltma tablosundaki bir girdinin yalnızca büyük harfle başlayan yazımda geçerli olduğunu belirtir; örneğin `av.` küçük harfli `av.` biçiminde kısaltma sayılmaz.

Cümle, bir sınırdan sonraki ilk belirteçten bitiren belirtece kadar (dahil) uzanır. `text`, `normalizedText.slice(start, end)` ile elde edilir. İçinden hiç kelime çıkmayan cümle (ör. yalnızca `...`) sonuçtan atılır ve sayılmaz.

Tipik durumlar:

- `"Geliyor musun?" dedi.` → tek cümle; S3, tırnaktan sonra küçük harf geldiği için bölmez.
- `Çok başarılı(!) bir toplantıydı.` → tek cümle; S4, parantez içindeki ünlem cümleyi bitirmez.
- `Bekledi... ve sonunda geldi.` → tek cümle; S6, üç noktadan sonra küçük harf var.
- `Elma, armut vb. aldık.` → tek cümle; `vb.` sınıfı `son` olsa da sonraki belirteç küçük harfle başlıyor.
- `Elma, armut vb. Sonra eve döndük.` → iki cümle; `vb.` sınıfı `son` ve sonraki belirteç büyük harfle başlıyor.
- `Sonuç 25. Ankara ikinci oldu.` → tek cümle; 1–2 basamaklı sayı + nokta sıra sayısı sayılır ve sonraki cümleyle birleşir.
- `Toplam 1250. Ankara ikinci oldu.` → iki cümle; dört basamaklı sayı + nokta, sonraki belirteç büyük harf olduğu için cümleyi bitirir.

### 4.3 Kelimeler

Bir cümlenin her belirteci için şu adımlar sırayla uygulanır:

1. **Kenar temizliği.** Baştan, `[\p{L}\p{N}%₺$€£&]` olmayan karakterler atılır. Sondan da aynı küme dışındaki karakterler atılır; **ancak sondaki noktalar şimdilik korunur**. Sonuç `core` olur. `noDots`, `core`'un sonundaki noktalar atılmış halidir. `noDots` boşsa belirteç kelime değildir.
2. **E-posta.** `noDots`, `^[^\s@]+@[^\s@]+\.[^\s@]+$` ile eşleşiyorsa yok sayılır; `ignored.emails` artar.
3. **URL.** `noDots`, büyük/küçük harf duyarsız şu kalıpla eşleşiyorsa yok sayılır; `ignored.urls` artar:

   ```text
   ^(?:https?:\/\/|www\.)\S+$|^[\w-]+(?:\.[\w-]+)*\.(?:com|org|net|edu|gov|tr|io|co|info|dev|app)(?:\/\S*)?$
   ```

4. **Kısaltma.** `core` ilk kesme işaretinden `head` ve `tail` (ek) olarak bölünür. `head`'in sonunda nokta varsa ve noktasız hali + `.` (küçük harfle) kısaltma tablosundaysa (ve `yalnızBüyük` koşulu sağlanıyorsa): **tek kelime**, türü `abbr`, hece = `countVowels(açılım) + countVowels(tail)`.
5. **Noktalı baş harfler.** `head`, `^(\p{L}\.)+\p{L}?$` ile eşleşiyor, tabloda yok ve en az 2 harf içeriyorsa: tek kelime, türü `abbr`, hece = harf sayısı + `countVowels(tail)`.
6. **Parçalara bölme.** `noDots` şu ayırıcılardan bölünür: `–`, `—` (her zaman) ve `/` (yalnızca iki yanında da harf varsa; `ve/veya` bölünür, `19/11/2026` bölünmez). Kısa çizgi `-` **bölmez** (`e-posta`, `2020-2026` tek kelimedir).
7. Her parça yeniden kenar temizliğinden geçer (nokta korunmadan). Parça tam olarak `&` ise: kelime, türü `symbol`, 1 hece ("ve"). Harf ya da rakam içermeyen parça kelime değildir.
8. Kalan her parça bir kelimedir; hecesi 5. bölümdeki kurallarla hesaplanır.

Kelimenin `text` alanı temizlenmiş parçadır (kısaltmalarda `noDots`); `start`/`end` bu parçanın `normalizedText` içindeki konumudur.

Her kelime için `prevIsNumber` bağlamı tutulur: aynı cümlede hemen önceki kelimenin türü `number` ise doğrudur. Kısaltma, URL, e-posta ve `&` bu bağlamı sıfırlar.

Örnekler:

- `e-posta` → tek kelime (kısa çizgi bölmez), hece 3.
- `ve/veya` → iki kelime: `ve` (1), `veya` (2).
- `19/11/2026` → tek kelime; eğik çizgi iki yanında harf olmadığı için bölünmez, sayı olarak okunur.
- `A.Ş.` → kısaltma tablosunda (`a.ş.`, 6 hece), tek kelime.
- `A.B.D.` → noktalı baş harf dizisi; harf sayısı 3, ek yoksa 3 hece.
- `Ali & Veli` → `&` ayrı bir `symbol` kelimesi, 1 hece.

## 5. Hece sayımı

**Temel ilke:** Türkçede her hecede tam bir ünlü vardır; hece sayısı ünlü sayısıdır. Aşağıdaki kurallar bu ilkenin yetmediği durumları (kısaltmalar, sayılar, birimler, sıra sayıları, yabancı sözcükler) kapsar.

Girdi: temizlenmiş parça `piece` ve bağlam `{acronyms, prevIsNumber, ordinal}`.

- `acronyms`: cümle metninde en az bir küçük harf varsa `true`. (Tamamı büyük harfle yazılmış cümlede kısaltma okunuşu kuralı kapatılır; `DİKKAT! BU ALANA…` gibi.)
- `ordinal`: belirteç 4.2'de sıra sayısı olarak işaretlendiyse `true`.

Adımlar:

1. `extra = 0`. Parçada `%` varsa `extra += 2` ("yüzde"). Parçada `₺ $ € £` karakterlerinden biri varsa `extra += 2` ("lira/dolar/avro"). Sonra `% ₺ $ € £ &` karakterleri parçadan silinir.
2. **Birim:** `prevIsNumber` doğru ve parça (olduğu gibi, büyük/küçük harf duyarlı) birim tablosundaysa (7.4): hece = `extra + countVowels(açılım)`, tür `unit`. Bitti.
3. **Romen sıra sayısı:** `ordinal` doğru ve parça `^[IVX]{2,}$` ise: değer Romen rakamından tam sayıya çevrilir; hece = sayının okunuşunun hecesi + sıra eki (6.4). Tür `number`. Bitti.
4. Parça ilk kesme işaretinden `head` ve `tail` olarak bölünür.
5. `head` şu kalıpla bölütlere ayrılır: `\d[\d.,:\/]*\d|\d|\p{L}+` (rakam öbekleri ve harf öbekleri; kısa çizgi ve diğer işaretler kendiliğinden ayırıcı olur).
6. Her bölüt için sırayla:
   - **Rakam bölütü:** 6. bölüme göre okunuşunun hecesi. `ordinal` doğruysa ve `head` tek bölütten oluşuyorsa sıra eki eklenir.
   - **Harf bölütü:** Kendisinden hemen önceki bölüt rakamsa (ya da ilk bölütse ve `prevIsNumber` doğruysa) ve bölüt birim tablosundaysa → birim açılımının hecesi. Değilse → `letterSyllables` (aşağıda).
7. `tail` için `countVowels(tail)` eklenir (ek; alt sınır uygulanmaz).
8. Tür: yalnızca rakam bölütü varsa `number`; hem rakam hem harf varsa `mixed`; aksi halde `word`.

**`letterSyllables(seg, acronyms)`** — `n` harf sayısı, `v` ünlü sayısı:

| Koşul                                                                                | Sonuç                              |
| ------------------------------------------------------------------------------------ | ---------------------------------- |
| `n == 1`                                                                             | 1                                  |
| `acronyms` ve bölütün bütün harfleri büyük, ve kısaltma adı istisna tablosunda (7.2) | tablodaki değer                    |
| `acronyms`, tümü büyük, `v == 0`                                                     | `n` (harf harf okunur: `TBMM` → 4) |
| `acronyms`, tümü büyük, `n ≤ 3`, küçük harfli hali kısa sözcük listesinde (7.3)      | `v` (`ÇOK` → 1)                    |
| `acronyms`, tümü büyük, `n ≤ 3`                                                      | `n` (`ABD` → 3, `AB` → 2)          |
| `acronyms`, tümü büyük, `n ≥ 4`                                                      | `v` (`NATO` → 2, `TÜBİTAK` → 3)    |
| Diğer, `v > 0`                                                                       | `v`                                |
| Diğer, `v == 0`                                                                      | `n` (`tv` → 2, `pdf` → 3)          |

Hece sayımına örnekler:

| Girdi            | Bağlam            | Hece | Açıklama                                |
| ---------------- | ----------------- | ---: | --------------------------------------- |
| `okunabilirlik`  | —                 |    6 | Ünlü sayısı                             |
| `Türkiye`        | —                 |    3 | Ünlü sayısı                             |
| `Ankara'ya`      | —                 |    4 | `Ankara` 3 + ek `a` 1                   |
| `TBMM`           | `acronyms`        |    4 | Ünlü yok; harf harf                     |
| `TBMM'nin`       | `acronyms`        |    5 | 4 + ek `i` 1                            |
| `ABD`            | `acronyms`        |    3 | Üç harf, kısa değil                     |
| `ABD`            | `acronyms: false` |    1 | Ünlü sayısı (`A`)                       |
| `NATO`           | `acronyms`        |    2 | Dört harf, ünlü sayısı                  |
| `TÜBİTAK`        | `acronyms`        |    3 | Dörtten uzun, ünlü sayısı               |
| `YÖK`            | `acronyms`        |    1 | İstisna tablosu                         |
| `ÇOK`            | `acronyms`        |    1 | Kısa sözcük, ünlü sayısı                |
| `tv`             | —                 |    2 | Ünlü yok; harf sayısı                   |
| `pdf`            | —                 |    3 | Ünlü yok; harf sayısı                   |
| `e-posta`        | —                 |    3 | Kısa çizgi bölmez; `e` 1 + `posta` 2    |
| `2026`           | —                 |    7 | `iki bin yirmi altı`                    |
| `2026'da`        | —                 |    8 | 7 + ek `a` 1                            |
| `%50`            | —                 |    4 | `yüzde` 2 + `elli` 2                    |
| `5km`            | —                 |    5 | `beş` 1 + `kilometre` 4 (birim)         |
| `5 km` (cümlede) | —                 |    5 | `beş` 1 + `kilometre` 4 (birim bağlamı) |

Not: `km` tek başına, önceki kelime sayı değilse ünlüsüz olduğu için harf harf okunur ve 2 hece sayılır; yalnızca bir sayıdan hemen sonra birim açılımıyla 4 hece olur.

## 6. Sayıların okunuşu

Sayılar Türkçe okunuşlarına çevrilir; hece, okunuştan sayılır. Bu, `2026` gibi sayıların "iki bin yirmi altı" üzerinden 7 hece sayılmasını sağlar.

### 6.1 Tam sayı (`cardinal`, 0 ≤ n < 10¹⁵)

- Birler: `bir iki üç dört beş altı yedi sekiz dokuz`
- Onlar: `on yirmi otuz kırk elli altmış yetmiş seksen doksan`
- Büyüklükler: `yüz`, `bin`, `milyon`, `milyar`, `trilyon`
- 0 → `sıfır`
- 100 → `yüz` (başına "bir" gelmez); 200 → `iki yüz`
- 1000 → `bin` (başına "bir" gelmez); 1.000.000 → `bir milyon` ("bir" gelir)
- Sözcükler boşlukla ayrılır: 2026 → `iki bin yirmi altı`

### 6.2 Rakam dizisinin çözümlenmesi (`numberWords`)

Sırayla ilk eşleşen kural uygulanır:

| #   | Kalıp                                | Okunuş                                                                                                                                                                                                 |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `^(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$` | Noktalar binlik ayırıcıdır. Tam kısım + (varsa) `virgül` + ondalık kısım. `1.250,50` → `bin iki yüz elli virgül elli`                                                                                  |
| R2  | `^(\d+),(\d+)$`                      | Tam kısım + `virgül` + ondalık kısım. `3,14` → `üç virgül on dört`                                                                                                                                     |
| R3  | `^\d+$`                              | Düz tam sayı (6.3)                                                                                                                                                                                     |
| R4  | Diğer (içinde `. , : /` olan)        | Ayırıcılardan gruplara bölünür; her grup **baştaki sıfırları atılarak** tam sayı okunur; tamamı sıfır olan grup `sıfır`. `14.30` → `on dört otuz`, `19.11.2026` → `on dokuz on bir iki bin yirmi altı` |

**Ondalık kısım.** Baştaki her sıfır ayrı `sıfır` okunur; kalan kısım tam sayı olarak okunur. `0,05` → `sıfır virgül sıfır beş`; `3,0` → `üç virgül sıfır`; `2,50` → `iki virgül elli` (sondaki sıfır ayrıca okunmaz).

### 6.3 Düz tam sayı dizisi

- Tamamı sıfır → `sıfır` (bir kez).
- Başında sıfır varsa (ör. `0532`, `007`) → basamak basamak okunur.
- 15 basamaktan uzunsa → basamak basamak okunur.
- Aksi halde `cardinal`.

### 6.4 Sıra eki

Sıra sayısı olarak işaretlenmiş bir sayıda, okunuşun son sözcüğü ünlüyle bitiyorsa **+1**, ünsüzle bitiyorsa **+2** hece eklenir:

- `iki` → `ikinci` (+1)
- `üç` → `üçüncü` (+2)
- `on dokuz` → `on dokuzuncu` (+2)

### 6.5 Romen rakamı

Yalnızca `I`, `V`, `X` harfleri kullanılır; standart çıkarmalı kural geçerlidir: `IV` = 4, `IX` = 9, `XIX` = 19.

## 7. Veri tabloları

Aşağıdaki tablolar `src/data/` altında birebir yer alır. Hece sütunu doğrulama içindir; kodda hece `countVowels(açılım)` ile hesaplanır, elle yazılmaz.

### 7.1 Kısaltmalar

Sınıf `bas`: hiçbir zaman cümle bitirmez. Sınıf `son`: sonraki belirteç büyük harfle başlıyorsa cümle bitirir.

| Kısaltma | Açılım              | Hece | Sınıf                            |
| -------- | ------------------- | ---: | -------------------------------- |
| `dr.`    | doktor              |    2 | bas                              |
| `prof.`  | profesör            |    3 | bas                              |
| `doç.`   | doçent              |    2 | bas                              |
| `yrd.`   | yardımcı            |    3 | bas                              |
| `av.`    | avukat              |    3 | bas (yalnızca baş harfi büyükse) |
| `sn.`    | sayın               |    2 | bas                              |
| `öğr.`   | öğretim             |    3 | bas                              |
| `gör.`   | görevlisi           |    4 | bas                              |
| `uzm.`   | uzman               |    2 | bas                              |
| `müh.`   | mühendis            |    3 | bas                              |
| `mim.`   | mimar               |    2 | bas                              |
| `alb.`   | albay               |    2 | bas                              |
| `yzb.`   | yüzbaşı             |    3 | bas                              |
| `hz.`    | hazreti             |    3 | bas                              |
| `no.`    | numara              |    3 | bas                              |
| `tel.`   | telefon             |    3 | bas                              |
| `cad.`   | cadde               |    2 | bas                              |
| `sok.`   | sokak               |    2 | bas                              |
| `sk.`    | sokak               |    2 | bas                              |
| `mah.`   | mahalle             |    3 | bas                              |
| `apt.`   | apartman            |    3 | bas                              |
| `blv.`   | bulvar              |    2 | bas                              |
| `bkz.`   | bakınız             |    3 | bas                              |
| `bk.`    | bakınız             |    3 | bas                              |
| `krş.`   | karşılaştırınız     |    6 | bas                              |
| `örn.`   | örneğin             |    3 | bas                              |
| `yak.`   | yaklaşık            |    3 | bas                              |
| `ort.`   | ortalama            |    4 | bas                              |
| `çev.`   | çeviren             |    3 | bas                              |
| `ed.`    | editör              |    3 | bas                              |
| `sy.`    | sayı                |    2 | bas                              |
| `ss.`    | sayfalar            |    3 | bas                              |
| `müd.`   | müdürlüğü           |    4 | bas                              |
| `üniv.`  | üniversitesi        |    6 | bas                              |
| `fak.`   | fakültesi           |    4 | bas                              |
| `tic.`   | ticaret             |    3 | bas                              |
| `san.`   | sanayi              |    3 | bas                              |
| `ltd.`   | limited             |    3 | bas                              |
| `t.c.`   | türkiye cumhuriyeti |    8 | bas                              |
| `m.ö.`   | milattan önce       |    5 | bas                              |
| `m.s.`   | milattan sonra      |    5 | bas                              |
| `vb.`    | ve benzeri          |    4 | son                              |
| `vs.`    | vesaire             |    4 | son                              |
| `vd.`    | ve diğerleri        |    5 | son                              |
| `a.ş.`   | anonim şirketi      |    6 | son                              |
| `şti.`   | şirketi             |    3 | son                              |
| `yy.`    | yüzyıl              |    2 | son                              |
| `a.g.e.` | adı geçen eser      |    6 | son                              |

`av.` girdisi yalnızca büyük harfle başlayan biçimde kısaltma sayılır. `Kolay bir av. Sonra…` örneğinde `av.` bir av anlamındadır ve cümleyi bitirir; `Av. Ayşe geldi.` örneğinde avukat kısaltmasıdır ve cümleyi bitirmez.

### 7.2 Kısaltma adı istisnaları (okunuşu kurala uymayanlar)

| Yazılış | Hece |
| ------- | ---: |
| `YÖK`   |    1 |
| `MEB`   |    1 |
| `MİT`   |    1 |
| `PIN`   |    1 |
| `ÖSYM`  |    4 |
| `AİHM`  |    4 |
| `İETT`  |    4 |
| `ODTÜ`  |    4 |

### 7.3 Kısa sözcükler (büyük harfle yazılsa da kısaltma sayılmayanlar)

```text
ve bu şu o en çok hiç her bir iki üç de da ki mi mı mu mü ne ya ile var yok tam son ilk
not dur gel git bak al ver yap et ol ama az biz siz ben sen tek hem bin on yüz iyi
```

### 7.4 Birimler (yalnızca bir sayıdan hemen sonra geçerli)

| Yazılış | Açılım        | Hece |
| ------- | ------------- | ---: |
| `km`    | kilometre     |    4 |
| `m`     | metre         |    2 |
| `cm`    | santimetre    |    4 |
| `mm`    | milimetre     |    4 |
| `kg`    | kilogram      |    3 |
| `g`     | gram          |    1 |
| `gr`    | gram          |    1 |
| `mg`    | miligram      |    3 |
| `lt`    | litre         |    2 |
| `l`     | litre         |    2 |
| `ml`    | mililitre     |    4 |
| `dk`    | dakika        |    3 |
| `sn`    | saniye        |    3 |
| `sa`    | saat          |    2 |
| `m2`    | metrekare     |    4 |
| `km2`   | kilometrekare |    6 |
| `m3`    | metreküp      |    3 |

## 8. Formüller ve düzeyler

Tanımlar: `W` kelime sayısı, `S` cümle sayısı, `H` toplam hece. `x1 = H / W`, `x2 = W / S`. Hece dağılımı: `d1…d5` tam o kadar heceli kelime sayısı, `d6` altı ve üzeri heceli kelime sayısı. (0 heceli çıkan bir kelime olursa `d1`'e sayılır.)

`W == 0` ise `scores` ve `averages` `null` olur. Düzey her zaman **yuvarlanmamış** puandan belirlenir; gösterimde puan bir ondalık basamağa yuvarlanır.

### 8.1 Ateşman (1997)

```text
puan = 198.825 − 40.175 × x1 − 2.610 × x2
```

| Koşul     | Kimlik      | Etiket        |
| --------- | ----------- | ------------- |
| puan ≥ 90 | `cok-kolay` | Çok kolay     |
| puan ≥ 70 | `kolay`     | Kolay         |
| puan ≥ 50 | `orta`      | Orta güçlükte |
| puan ≥ 30 | `zor`       | Zor           |
| puan < 30 | `cok-zor`   | Çok zor       |

Puan 100'ü aşabilir ya da sıfırın altına inebilir; kırpma **yapılmaz**, olduğu gibi döndürülür. Ateşman ölçeğinde yüksek puan kolay metin anlamına gelir.

### 8.2 Çetinkaya-Uzun (2010)

```text
puan = 118.823 − 25.987 × x1 − 0.971 × x2
```

| Koşul     | Kimlik        | Etiket                                  |
| --------- | ------------- | --------------------------------------- |
| puan ≥ 51 | `bagimsiz`    | Bağımsız okuma düzeyi (5–7. sınıf)      |
| puan ≥ 35 | `egitsel`     | Eğitsel okuma düzeyi (8–9. sınıf)       |
| puan < 35 | `engelleyici` | Engelleyici okuma düzeyi (10–12. sınıf) |

Çetinkaya-Uzun ölçeğinde de yüksek puan kolay metin anlamına gelir.

### 8.3 Bezirci-Yılmaz (2010), Yeni Okunabilirlik Değeri

```text
OKS = x2
H3 = d3 / S,  H4 = d4 / S,  H5 = d5 / S,  H6 = d6 / S
YOD = √( OKS × (H3 × 0.84 + H4 × 1.5 + H5 × 3.5 + H6 × 26.25) )
```

| Koşul    | Kimlik       | Etiket     |
| -------- | ------------ | ---------- |
| YOD ≤ 8  | `ilkogretim` | İlköğretim |
| YOD ≤ 12 | `lise`       | Lise       |
| YOD ≤ 16 | `lisans`     | Lisans     |
| YOD > 16 | `akademik`   | Akademik   |

Bu ölçekte **yüksek değer daha zor metin** demektir.

**Eşik kararı.** Kaynaklarda aralıklar "1–8, 9–12, 12–16, 16+" ve "1–8, 9–12, 13–16, 16+" biçiminde, tam sayılarla ve küçük farklarla verilir. Kesirli YOD değerlerinin bir düzeye atanabilmesi için üst sınırlar `≤ 8`, `≤ 12`, `≤ 16` ve `> 16` olarak seçilmiştir. Eşikler `formulas.ts` içinde tek bir sabitte tutulur; gerekçe `docs/kararlar.md` dosyasındadır.

### 8.4 Sayımlar, uyarılar ve örnek

- `counts.characters`: `normalizedText` içindeki Unicode **kod noktası** sayısı.
- `counts.letters`: `\p{L}` eşleşme sayısı.
- `warnings`:
  - `empty`: `W == 0`.
  - `short-text`: `0 < W < 100`. İleti: "Metin 100 kelimeden kısa; formül sonuçları kısa metinlerde güvenilir değildir."

T3 metni (şartname Ek B) için `W = 35`, `S = 5`, `H = 115`, `d3 = 7`, `d4 = 9`, `d5 = 3`, `d6 = 3`:

```text
x1 = 115 / 35 = 3,2857…
x2 = 35 / 5  = 7,0
Ateşman        = 198,825 − 40,175 × 3,2857… − 2,610 × 7,0 = 48,5514…  → 48,6  Zor
Çetinkaya-Uzun = 118,823 − 25,987 × 3,2857… − 0,971 × 7,0 = 26,6401…  → 26,6  Engelleyici
Bezirci-Yılmaz = √(7,0 × (1,4×0,84 + 1,8×1,5 + 0,6×3,5 + 0,6×26,25))
               = √(7,0 × 21,726) = 12,3322…                          → 12,3  Lisans
```

Bu değerler, şartnamedeki T3 örneğinin beklenen değerleridir; CLI çıktısıyla birebir eşleşir.

## 9. Tanılama

Varsayılan eşikler: `longSentence = 20`, `veryLongSentence = 30`, `longWord = 6`. Bu değerler seçeneklerle değiştirilebilir.

### 9.1 Uzun cümle

- Kelime sayısı ≥ `veryLongSentence` → `very-long-sentence`. İleti: `Bu cümle {n} kelime; çok uzun. Bölün.`
- Değilse kelime sayısı ≥ `longSentence` → `long-sentence`. İleti: `Bu cümle {n} kelime. İkiye bölmeyi düşünün.`
- Konum: cümlenin tamamı.

### 9.2 Uzun kelime

- Türü `word` olan ve hecesi ≥ `longWord` olan her kelime → `long-word`. İleti: `{n} heceli uzun kelime. Daha kısa bir karşılığı var mı?`
- Sayılar, kısaltmalar ve birimler işaretlenmez.

### 9.3 Sade karşılık

Karşılaştırma için `fold(s) = lowerTr(s)` ve ardından `â → a`, `î → i`, `û → u` dönüşümü uygulanır.

Her cümlede kelimeler soldan sağa taranır. Her konumda, tablodaki bütün girdilerin bütün kalıpları denenir:

- Kalıp boşlukla sözcüklere ayrılır. Son sözcük dışındakiler, cümledeki karşılık gelen kelimeyle (`fold` sonrası) **tam eşit** olmalıdır.
- Son sözcük: girdi `tam` ise tam eşitlik; `ön ek` ise cümledeki kelime kalıpla **başlamalıdır** (ekli biçimleri yakalamak için).
- Aynı konumda birden çok eşleşme varsa en çok sözcüklü kalıp seçilir. Eşleşme bulunduğunda tarama, eşleşen son kelimeden sonra sürer.
- Sonuç: `plain-alternative`; konum ilk kelimenin başından son kelimenin sonuna; `suggestion` tablodaki öneri; ileti: `Daha sade karşılık: {öneri}`.

| Kalıp(lar)                 | Eşleşme | Öneri                                             |
| -------------------------- | ------- | ------------------------------------------------- |
| `işbu`                     | tam     | bu                                                |
| `mezkur`                   | ön ek   | söz konusu, anılan                                |
| `müteakip`, `müteakib`     | ön ek   | sonraki, ardından                                 |
| `akabinde`                 | tam     | ardından                                          |
| `binaen`                   | tam     | dayanarak, bu nedenle                             |
| `istinaden`                | tam     | dayanarak                                         |
| `zarfında`                 | tam     | içinde                                            |
| `hasebiyle`                | tam     | nedeniyle                                         |
| `marifetiyle`              | tam     | aracılığıyla, eliyle                              |
| `bilahare`                 | tam     | daha sonra                                        |
| `derhal`                   | tam     | hemen                                             |
| `şayet`                    | tam     | eğer                                              |
| `zira`                     | tam     | çünkü                                             |
| `mütalaa`                  | ön ek   | görüş                                             |
| `muhteviyat`               | ön ek   | içerik                                            |
| `müracaat`                 | ön ek   | başvuru                                           |
| `nezdinde`                 | tam     | katında, yanında                                  |
| `tarafınıza`               | tam     | size                                              |
| `tarafımıza`               | tam     | bize                                              |
| `tarafınızca`              | tam     | sizin tarafınızdan (ya da etken cümle: "siz ...") |
| `tarafımızca`              | tam     | bizim tarafımızdan (ya da etken cümle: "biz ...") |
| `ihtiva et`, `ihtiva ed`   | ön ek   | içermek                                           |
| `iştirak et`, `iştirak ed` | ön ek   | katılmak                                          |
| `temin et`, `temin ed`     | ön ek   | sağlamak                                          |
| `tanzim et`, `tanzim ed`   | ön ek   | düzenlemek                                        |
| `tebliğ et`, `tebliğ ed`   | ön ek   | bildirmek                                         |
| `ifa et`, `ifa ed`         | ön ek   | yerine getirmek                                   |
| `ikmal et`, `ikmal ed`     | ön ek   | tamamlamak                                        |
| `tetkik et`, `tetkik ed`   | ön ek   | incelemek                                         |
| `tevdi et`, `tevdi ed`     | ön ek   | vermek, teslim etmek                              |
| `tesis et`, `tesis ed`     | ön ek   | kurmak                                            |
| `ihdas et`, `ihdas ed`     | ön ek   | oluşturmak, kurmak                                |
| `sarf et`, `sarf ed`       | ön ek   | harcamak                                          |
| `tabi tut`                 | ön ek   | uygulamak ("-e tabi tutulur" yerine "-ir/-ilir")  |
| `irtibata geç`             | ön ek   | iletişime geçmek                                  |

Bu liste bir başlangıçtır ve tavsiye niteliğindedir; arayüzde "öneri" olarak sunulur, "hata" olarak değil. `options.suggestions === false` ise bu denetim çalışmaz.

Bulgular `start` değerine göre artan sırada döner; eşitlikte cümle türleri, `long-word`, `plain-alternative` sırası uygulanır. Sade karşılık önerileri bağlama bakmaz; aynı sözcük her geçtiği yerde önerilebilir.

## 10. Sınırlar ve kararlar

Bu yöntem yalnızca yüzeysel ölçütler kullanır: kelime ve cümle uzunluğu, hece dağılımı ve tabloya dayalı sözcük eşleşmesi. Anlam, tutarlılık, dil bilgisi ve okurun ön bilgisi ölçülmez. Formüller en az 100 kelimelik düzyazı için tasarlanmıştır; şiir, liste, tablo ve çok kısa metinlerde sonuç yanıltıcı olabilir. Yabancı kökenli sözcüklerde ünlü sayısı hece sayısını tutmayabilir; kısaltma ve sade karşılık tabloları sınırlıdır.

Bilinen sınırlamaların tam listesi README ve [docs/kararlar.md](kararlar.md) dosyasında aynen yer alır. Bu belgedeki kurallar hakkında bir öneri ya da itiraz varsa, algoritma çıktısını değiştirmeden önce kararlar belgesine ve proje sahibine başvurun.

## 11. Kaynakça

- Ateşman, E. (1997). Türkçede okunabilirliğin ölçülmesi. _Dil Dergisi_, 58, 71–74.
- Bezirci, B. ve Yılmaz, A. E. (2010). Metinlerin okunabilirliğinin ölçülmesi üzerine bir yazılım kütüphanesi ve Türkçe için yeni bir okunabilirlik ölçütü. _Dokuz Eylül Üniversitesi Mühendislik Fakültesi Fen ve Mühendislik Dergisi_, 12(3), 49–62.
- Çetinkaya, G. (2010). _Türkçe metinlerin okunabilirlik düzeylerinin tanımlanması ve sınıflandırılması_ (Doktora tezi). Ankara Üniversitesi.
- Flesch, R. (1948). A new readability yardstick. _Journal of Applied Psychology_, 32(3), 221–233. (Ateşman formülünün uyarlandığı özgün çalışma.)

### Bu belgeye atıf

```bibtex
@misc{okunur-yontem-2026,
  title        = {okunur: Türkçe metinler için okunabilirlik ölçer — Yöntem},
  author       = {{SAHIP_ADI}},
  year         = {2026},
  version      = {0.1.0},
  note         = {Algoritma sürümü 1},
  howpublished = {\url{https://github.com/{GITHUB_KULLANICI}/okunur/blob/main/docs/yontem.md}}
}
```

Yazılımın tamamı için hazır künye [CITATION.cff](../CITATION.cff) dosyasındadır. Yayımlamadan önce kaynak künyelerini özgün kaynaklardan bir kez daha doğrulayın.
