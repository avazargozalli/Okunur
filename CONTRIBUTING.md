# Katkı Rehberi

`okunur`'a ilgi gösterdiğiniz için teşekkürler. Bu rehber, geliştirme ortamını kurmayı, değişiklik göndermeyi ve yanlış sonuç bildirmeyi anlatır. Katılım için [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) geçerlidir.

## Geliştirme ortamı

- Node.js **22 veya üzeri** ve npm gerekir.
- Depoyu çatallayıp klonlayın, sonra bağımlılıkları kilitten kurun:

```bash
git clone https://github.com/avazargozalli/Okunur.git
cd Okunur
npm ci
```

- Değişiklik göndermeden önce tam denetimi çalıştırın:

```bash
npm run check
```

`npm run check` sırasıyla lint, tip denetimi, kapsamlı testler, kütüphane derlemesi ve web derlemesini çalıştırır. Tek tek komutlar:

```bash
npm run lint        # Biome denetimi
npm run format      # Biome ile biçimlendir
npm run typecheck   # tsc --noEmit
npm test            # testler
npm run coverage    # kapsam raporu (eşik %90)
npm run build       # dist/ üretimi
npm run web:build   # dist-web/ üretimi
npm run web:dev     # web uygulamasını geliştirme kipinde aç
```

- `node_modules/`, `dist/`, `dist-web/`, `coverage/` ve `*.tsbuildinfo` üretilmiş dosyalardır; commit etmeyin.
- Çalışma zamanı bağımlılığı eklemeyin. Geliştirme bağımlılıkları yalnızca şunlarla sınırlıdır: `typescript`, `vitest`, `@vitest/coverage-v8`, `vite`, `@biomejs/biome`, `@types/node`.
- Kod içi adlar (değişken, işlev, tip, dosya) İngilizce; kullanıcıya görünen metinler (CLI, hata iletileri, arayüz) Türkçe olmalıdır. Kod yorumları Türkçe olabilir.

## Dal ve PR akışı

1. Depoyu çatallayın ve `main` dalından kısa açıklamalı bir dal açın:

   ```bash
   git switch -c duzeltme/kisa-cizgi-kurali
   ```

2. Değişikliği küçük ve konuya odaklı tutun. İlgisiz biçimlendirme değişikliklerini ayrı PR'a bırakın.
3. Testleri ekleyin ya da güncelleyin. Hata düzeltiyorsanız hatayı yakalayan bir test yoksa PR kabul edilmez.
4. `npm run check` temiz geçmeden PR açmayın.
5. PR açıklamasında neyin değiştiğini, neden değiştiğini ve hangi sorunu kapattığını yazın. Şablon: [.github/pull_request_template.md](.github/pull_request_template.md).
6. İnceleme sırasında geri bildirimleri aynı dalda yeni commit'lerle karşılayın; geçmişi zorla yeniden yazmayın.
7. PR'lar `main` dalına birleştirilir; CI yeşil olmalıdır. Birleştirme biçimi (squash/merge) proje sahibinin tercihine bağlıdır.

## Algoritma çıktısını değiştiren PR'lar

`okunur`'un çıktısı sürümlenmiştir: `ALGORITHM_VERSION = 1`. Aşağıdakilerden biri değişiyorsa **algoritma çıktısı değişiyor** demektir:

- cümle, kelime veya hece sayımı;
- puanlar, düzeyler veya uyarılar;
- bulguların türü, konumu, iletisi ya da sırası;
- normalize metin veya konumlar.

Bu durumda:

- Şartnamedeki test vektörleri (`test/vectors/`) keyfî olarak değiştirilemez. Değişiklik önerisi, hangi girdilerin sonucunun neden değiştiğini gösteren bir açıklama ve güncellenmiş vektörlerle birlikte tartışılır.
- `ALGORITHM_VERSION` artışı gerekir; bu her zaman en az **ikincil (minor)** sürüm artışıdır.
- CHANGELOG'da "Algoritma" başlığı altında, hangi girdilerin sonucunun değiştiği açıklanır.
- `docs/kararlar.md` dosyasına tarih, karar ve gerekçe eklenir.

Algoritmayı "iyileştirme" amacıyla sessizce değiştiren PR'lar kabul edilmez. Daha iyi bir kural öneriniz varsa önce kararlar belgesine öneri olarak yazın.

## Kısaltma, birim veya sade karşılık ekleme

Veri tabloları `src/data/` altındadır. Yeni bir satır eklemek için:

1. İlgili tabloyu düzenleyin:
   - kısaltmalar: `src/data/abbreviations.ts` (açılım, sınıf `bas`/`son`, gerekiyorsa yalnızca büyük harf koşulu);
   - kısaltma adı istisnaları: `src/data/acronyms.ts`;
   - kısa sözcükler: `src/data/acronyms.ts`;
   - birimler: `src/data/units.ts` (yalnızca sayıdan hemen sonra geçerli);
   - sade karşılıklar: `src/data/plain-alternatives.ts` (tam eşleşme ya da ön ek, öneri metni).
2. Tabloya satır ekleyin; hece sütununu elle yazmayın, açılımdan `countVowels` ile doğrulanmasını sağlayın.
3. En az bir test ekleyin: kısaltma/birim için `test/syllables.test.ts` veya `test/sentences.test.ts`; sade karşılık için `test/diagnostics.test.ts`.
4. `docs/yontem.md` içindeki ilgili tabloyu güncelleyin.
5. `npm run check` çalıştırın.

Yeni bir kısaltma tabloya eklenirken cümle bitirme davranışı da seçilmelidir: `bas` hiçbir zaman bitirmez; `son` yalnızca sonraki belirteç büyük harfle başlıyorsa bitirir.

## Yanlış sonuç bildirme

Okunabilirlik sonucu beklediğinizden farklıysa lütfen [yanlış sonuç şablonunu](https://github.com/avazargozalli/Okunur/issues/new?template=yanlis-sonuc.yml) kullanın. Şunları ekleyin:

- **Metin:** Sorunu gösteren en kısa metin (kişisel veri içermesin).
- **Beklenen:** Hangi cümle/kelime/hece sayısı ya da puan bekleniyordu?
- **Bulunan:** Araç ne verdi? Mümkünse puan, düzey ve bulgu metni.
- **Yüzey:** Web, CLI ya da kütüphane.
- **Sürüm:** Paket sürümü ve `ALGORITHM_VERSION` (arayüzde alt bölümde yazar).

Metin, beklenen ve bulunan alanları olmadan sorunu yeniden üretmek çoğu zaman mümkün olmaz. Büyük metinlerde sorunu en küçük örneğe indirmeye çalışın.

## Hata ve güvenlik bildirimleri

- Genel hatalar için [hata şablonu](https://github.com/avazargozalli/Okunur/issues/new?template=hata.yml).
- Özellik ve sade karşılık önerileri için [öneri şablonu](https://github.com/avazargozalli/Okunur/issues/new?template=oneri.yml).
- Güvenlik açıkları için **herkese açık issue açmayın**; [SECURITY.md](SECURITY.md) izleyin.

## Yayın süreci

### GitHub Pages

Herkese açık `avazargozalli/Okunur` deposunun varsayılan dalı `main` olmalı. Depoda **Settings → Pages → Build and deployment → Source** alanında **GitHub Actions** seçin. **Actions → GitHub Pages → Run workflow** ile ilk derlemeyi başlatın. Sonraki `main` güncellemeleri siteyi otomatik derler. [GitHub Pages belgeleri](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Güvenlik bildirim formunu **Settings → Advanced Security → Private vulnerability reporting** altında etkinleştirin. [GitHub güvenlik belgeleri](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)

### İlk npm yayını

Node 24 ile temiz `main` kopyasında testleri ve derlemeleri çalıştırın. İnceleyip yayımlayacağınız arşivi geçici bir dizine alın.

```bash
archive_dir="$(mktemp -d)"
npm ci
npm run check
npm pack --pack-destination "$archive_dir"
tar -tzf "$archive_dir/okunur-0.1.0.tgz"
```

İlk yayında npm hesabınızla oturum açın ve iki faktörlü doğrulamayı tamamlayın. Paket kaydı açıldığında, arşivi ürettiğiniz commit'i etiketleyin. [npm ilk yayın belgeleri](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/)

```bash
npm login --registry=https://registry.npmjs.org
npm publish "$archive_dir/okunur-0.1.0.tgz"
git tag -a v0.1.0 -m "okunur 0.1.0"
git push origin v0.1.0
```

`release.yml` etiketteki paket sürümünü ve CHANGELOG kaydını denetler. npm'de kayıtlı bir sürüm varsa önce arşivlerin bütünlük özetlerini karşılaştırır. Özetler farklıysa npm arşivini indirir ve dosya adlarını, içeriklerini ve çalıştırma izinlerini doğrular. Okuma ve yazma izinleri arşiv karşılaştırmasını etkilemez.

### Sonraki npm sürümleri

Bir sonraki sürüm yayımlanmaya hazır olduğunda npm paket ayarlarında **Trusted publishing** altında GitHub Actions seçin. Sahip olarak `avazargozalli`, depo olarak `Okunur`, iş akışı olarak `release.yml` girin. **Allow npm publish** seçeneğini işaretleyin ve ortam alanını boş bırakın. npm, yeni bağlantıyı ilk başarılı otomatik yayınla doğrular ve bunun için iki gün süre verir. [npm Trusted Publishing belgeleri](https://docs.npmjs.com/trusted-publishers/)

`package.json`, `package-lock.json`, `src/index.ts`, `CITATION.cff` ve CHANGELOG'daki sürüm bilgilerini birlikte güncelleyin. **Actions → Sürüm → Run workflow** üzerinden derleme ve arşiv denetimini elle çalıştırabilirsiniz. Sürüm commit'ini `v` ile başlayan etiketle GitHub'a gönderdiğinizde iş akışı paketi npm'e yayımlar ve GitHub sürümünü oluşturur. Yeniden çalıştırıldığında npm'deki paket içeriğini doğrulayıp tamamlanmamış GitHub adımına devam eder.

## Lisans

Katkılarınız MIT Lisansı altında kabul edilir; ayrıntılar [LICENSE](LICENSE).
