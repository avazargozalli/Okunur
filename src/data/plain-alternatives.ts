/**
 * Sade karşılık önerileri (Bölüm 7.11.3).
 *
 * `patterns`: büyük/küçük harf duyarsız, `fold` sonrası karşılaştırılır; kalıp
 * boşlukla sözcüklere ayrılır.
 * `exact`: son sözcük tam eşleşmeli mi? Yanlışsa cümledeki sözcük kalıpla başlamalıdır
 * (ekli biçimleri yakalamak için).
 *
 * Bu liste bir başlangıçtır ve tavsiye niteliğindedir; arayüzde "öneri" olarak sunulur.
 */

export interface PlainAlternative {
  /** Kalıplar; birden çok yazım için birden çok kalıp. */
  patterns: string[];
  /** Türkçe öneri metni. */
  suggestion: string;
  /** Son sözcük tam eşleşmeli mi? (Varsayılan: ön ek eşleşmesi.) */
  exact: boolean;
}

export const PLAIN_ALTERNATIVES: readonly PlainAlternative[] = [
  { patterns: ["işbu"], suggestion: "bu", exact: true },
  { patterns: ["mezkur"], suggestion: "söz konusu, anılan", exact: false },
  { patterns: ["müteakip", "müteakib"], suggestion: "sonraki, ardından", exact: false },
  { patterns: ["akabinde"], suggestion: "ardından", exact: true },
  { patterns: ["binaen"], suggestion: "dayanarak, bu nedenle", exact: true },
  { patterns: ["istinaden"], suggestion: "dayanarak", exact: true },
  { patterns: ["zarfında"], suggestion: "içinde", exact: true },
  { patterns: ["hasebiyle"], suggestion: "nedeniyle", exact: true },
  { patterns: ["marifetiyle"], suggestion: "aracılığıyla, eliyle", exact: true },
  { patterns: ["bilahare"], suggestion: "daha sonra", exact: true },
  { patterns: ["derhal"], suggestion: "hemen", exact: true },
  { patterns: ["şayet"], suggestion: "eğer", exact: true },
  { patterns: ["zira"], suggestion: "çünkü", exact: true },
  { patterns: ["mütalaa"], suggestion: "görüş", exact: false },
  { patterns: ["muhteviyat"], suggestion: "içerik", exact: false },
  { patterns: ["müracaat"], suggestion: "başvuru", exact: false },
  { patterns: ["nezdinde"], suggestion: "katında, yanında", exact: true },
  { patterns: ["tarafınıza"], suggestion: "size", exact: true },
  { patterns: ["tarafımıza"], suggestion: "bize", exact: true },
  {
    patterns: ["tarafınızca"],
    suggestion: 'sizin tarafınızdan (ya da etken cümle: "siz ...")',
    exact: true,
  },
  {
    patterns: ["tarafımızca"],
    suggestion: 'bizim tarafımızdan (ya da etken cümle: "biz ...")',
    exact: true,
  },
  { patterns: ["ihtiva et", "ihtiva ed"], suggestion: "içermek", exact: false },
  { patterns: ["iştirak et", "iştirak ed"], suggestion: "katılmak", exact: false },
  { patterns: ["temin et", "temin ed"], suggestion: "sağlamak", exact: false },
  { patterns: ["tanzim et", "tanzim ed"], suggestion: "düzenlemek", exact: false },
  { patterns: ["tebliğ et", "tebliğ ed"], suggestion: "bildirmek", exact: false },
  { patterns: ["ifa et", "ifa ed"], suggestion: "yerine getirmek", exact: false },
  { patterns: ["ikmal et", "ikmal ed"], suggestion: "tamamlamak", exact: false },
  { patterns: ["tetkik et", "tetkik ed"], suggestion: "incelemek", exact: false },
  { patterns: ["tevdi et", "tevdi ed"], suggestion: "vermek, teslim etmek", exact: false },
  { patterns: ["tesis et", "tesis ed"], suggestion: "kurmak", exact: false },
  { patterns: ["ihdas et", "ihdas ed"], suggestion: "oluşturmak, kurmak", exact: false },
  { patterns: ["sarf et", "sarf ed"], suggestion: "harcamak", exact: false },
  {
    patterns: ["tabi tut"],
    suggestion: 'uygulamak ("-e tabi tutulur" yerine "-ir/-ilir")',
    exact: false,
  },
  { patterns: ["irtibata geç"], suggestion: "iletişime geçmek", exact: false },
];
