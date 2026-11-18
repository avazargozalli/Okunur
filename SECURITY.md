# Güvenlik Politikası

## Desteklenen sürümler

| Sürüm        | Güvenlik düzeltmeleri |
| ------------ | --------------------- |
| 0.1.x        | Evet                  |
| 0.1.0 öncesi | Hayır                 |

## Açık bildirimi

Güvenlik açıklarını **herkese açık issue olarak bildirmeyin**. Bunun yerine GitHub'ın özel güvenlik açığı bildirimi akışını kullanın:

<https://github.com/{GITHUB_KULLANICI}/okunur/security/advisories/new>

Bu bağlantı çalışmıyorsa (özellik depo sahibi tarafından etkinleştirilmemişse) **{ILETISIM_EPOSTA}** adresine e-posta gönderin. E-postanın konusuna `okunur güvenlik` yazın.

Bildiriminizde şunları paylaşın:

- Açığın kısa açıklaması ve etkisi (ör. tarayıcıda betik çalıştırma, dosya sistemi erişimi, hizmet dışı bırakma).
- Açığı yeniden üretmenin en küçük adımları; varsa kavram kanıtı.
- Etkilenen sürüm veya commit, `ALGORITHM_VERSION` ve kullanılan yüzey (Web, CLI, kütüphane).
- Varsa önerdiğiniz düzeltme veya azaltma.

Lütfen bildiriminize gerçek kişilere ait metinler, kimlik bilgileri veya başka hassas veriler eklemeyin; sorunu yapay bir örnekle göstermeye çalışın.

## Kapsam

- **Kütüphane ve CLI:** Girdi işleme, dosya okuma, hata iletileri ve çıktı biçimlendirme.
- **Web uygulaması:** Kullanıcı metninin sayfaya basılması, içerik güvenlik politikası, dış kaynak kullanımı ve tarayıcıda metin saklama.
- **Tedarik zinciri:** Yayımlanan paket, bağımlılıklar ve GitHub Actions iş akışları.

Okunabilirlik puanının beklenenden farklı çıkması, cümle/kelime bölütleme hatası veya sade karşılık önerisinin uygun olmaması **güvenlik açığı değildir**; bunlar için [yanlış sonuç şablonunu](https://github.com/{GITHUB_KULLANICI}/okunur/issues/new?template=yanlis-sonuc.yml) kullanın.

## Süreç

- Bildirimi gizli tutarız; ayrıntıları yalnızca düzeltmeyi yapanlarla paylaşırız.
- Bildirimi en kısa sürede incelemeye çalışırız; bu bir gönüllü projedir, bu nedenle kesin bir yanıt süresi taahhüt edilmez.
- Düzeltme hazır olduğunda sizinle koordineli bir açıklama yapmayı hedefleriz. İsterseniz katkınız için teşekkür edilir; kimliğinizin açıklanmasını istemiyorsanız belirtin.
- Güvenlik açığı kapatılana kadar ayrıntıları herkese açık paylaşmayın.
- Bu proje bir hata ödülü (bug bounty) programı sunmaz.

## Güvenli kullanım notları

- Web uygulaması metni tarayıcıdan dışarı göndermez; yine de hassas metinleri yalnızca güvendiğiniz bir tarayıcıda ve güncel sürümle işleyin.
- CLI, verdiğiniz dosyaları yerel olarak okur; dosya yollarını güvenilmeyen girdilerden üretmeyin.
- Paketi kilitli sürümlerle (`package-lock.json`) kurun ve güncellemeleri gözden geçirin.
