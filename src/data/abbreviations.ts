/**
 * Kısaltmalar (Bölüm 7.9.1).
 *
 * Sınıf `bas`: hiçbir zaman cümle bitirmez.
 * Sınıf `son`: sonraki belirteç büyük harfle başlıyorsa cümle bitirir.
 * `onlyCapitalized`: kısaltma yalnızca büyük harfle başlıyorsa geçerlidir (`av.`).
 *
 * Hece sütunu şartnamede doğrulama içindir; kodda `countVowels(expansion)` ile hesaplanır.
 */

export type AbbreviationBoundary = "bas" | "son";

export interface Abbreviation {
  /** Türkçe açılım. */
  expansion: string;
  /** Cümle sınırı davranışı. */
  boundary: AbbreviationBoundary;
  /** Yalnızca büyük harfle başlıyorsa kısaltma sayılır. */
  onlyCapitalized?: boolean;
}

const BAS = "bas";

const entries: Array<[string, Abbreviation]> = [
  ["dr.", { expansion: "doktor", boundary: BAS }],
  ["prof.", { expansion: "profesör", boundary: BAS }],
  ["doç.", { expansion: "doçent", boundary: BAS }],
  ["yrd.", { expansion: "yardımcı", boundary: BAS }],
  ["av.", { expansion: "avukat", boundary: BAS, onlyCapitalized: true }],
  ["sn.", { expansion: "sayın", boundary: BAS }],
  ["öğr.", { expansion: "öğretim", boundary: BAS }],
  ["gör.", { expansion: "görevlisi", boundary: BAS }],
  ["uzm.", { expansion: "uzman", boundary: BAS }],
  ["müh.", { expansion: "mühendis", boundary: BAS }],
  ["mim.", { expansion: "mimar", boundary: BAS }],
  ["alb.", { expansion: "albay", boundary: BAS }],
  ["yzb.", { expansion: "yüzbaşı", boundary: BAS }],
  ["hz.", { expansion: "hazreti", boundary: BAS }],
  ["no.", { expansion: "numara", boundary: BAS }],
  ["tel.", { expansion: "telefon", boundary: BAS }],
  ["cad.", { expansion: "cadde", boundary: BAS }],
  ["sok.", { expansion: "sokak", boundary: BAS }],
  ["sk.", { expansion: "sokak", boundary: BAS }],
  ["mah.", { expansion: "mahalle", boundary: BAS }],
  ["apt.", { expansion: "apartman", boundary: BAS }],
  ["blv.", { expansion: "bulvar", boundary: BAS }],
  ["bkz.", { expansion: "bakınız", boundary: BAS }],
  ["bk.", { expansion: "bakınız", boundary: BAS }],
  ["krş.", { expansion: "karşılaştırınız", boundary: BAS }],
  ["örn.", { expansion: "örneğin", boundary: BAS }],
  ["yak.", { expansion: "yaklaşık", boundary: BAS }],
  ["ort.", { expansion: "ortalama", boundary: BAS }],
  ["çev.", { expansion: "çeviren", boundary: BAS }],
  ["ed.", { expansion: "editör", boundary: BAS }],
  ["sy.", { expansion: "sayı", boundary: BAS }],
  ["ss.", { expansion: "sayfalar", boundary: BAS }],
  ["müd.", { expansion: "müdürlüğü", boundary: BAS }],
  ["üniv.", { expansion: "üniversitesi", boundary: BAS }],
  ["fak.", { expansion: "fakültesi", boundary: BAS }],
  ["tic.", { expansion: "ticaret", boundary: BAS }],
  ["san.", { expansion: "sanayi", boundary: BAS }],
  ["ltd.", { expansion: "limited", boundary: BAS }],
  ["t.c.", { expansion: "türkiye cumhuriyeti", boundary: BAS }],
  ["m.ö.", { expansion: "milattan önce", boundary: BAS }],
  ["m.s.", { expansion: "milattan sonra", boundary: BAS }],
  ["vb.", { expansion: "ve benzeri", boundary: "son" }],
  ["vs.", { expansion: "vesaire", boundary: "son" }],
  ["vd.", { expansion: "ve diğerleri", boundary: "son" }],
  ["a.ş.", { expansion: "anonim şirketi", boundary: "son" }],
  ["şti.", { expansion: "şirketi", boundary: "son" }],
  ["yy.", { expansion: "yüzyıl", boundary: "son" }],
  ["a.g.e.", { expansion: "adı geçen eser", boundary: "son" }],
];

export const ABBREVIATIONS: ReadonlyMap<string, Abbreviation> = new Map(entries);
