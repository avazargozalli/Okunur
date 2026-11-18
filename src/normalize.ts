/**
 * Normalizasyon (Bölüm 7.2).
 *
 * N1–N8 sırası bağlayıcıdır; bütün konumlar (`start`, `end`) normalize edilmiş metin
 * üzerindeki UTF-16 kod birimi indeksleridir (Bölüm 7.1).
 */

/** N1–N8: normalizasyon. */
export function normalize(text: string): string {
  // N1: Unicode NFC
  let value = text.normalize("NFC");
  // N2: \r\n ve \r → \n
  value = value.replace(/\r\n?/g, "\n");
  // N3: yumuşak tire, sıfır genişlikli karakterler, kelime birleştirici, BOM silinir
  value = value.replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, "");
  // N4: sekme, NBSP, ince boşluklar, dar NBSP, ideografik boşluk → normal boşluk
  value = value.replace(/[\t\u00A0\u2000-\u200A\u202F\u3000]/g, " ");
  // N5: tipografik kesme işaretleri → '
  value = value.replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'");
  // N6: üç nokta karakteri → ...
  value = value.replace(/\u2026/g, "...");
  // N7: üst simge 2 ve 3
  value = value.replace(/²/g, "2").replace(/³/g, "3");
  // N8: eksik boşluk onarımı (Geldi.Sonra → Geldi. Sonra)
  value = value.replace(/(\p{Ll}{2})([.!?])(\p{Lu}\p{Ll})/gu, "$1$2 $3");
  return value;
}

/**
 * `joinLines` seçeneği: ardından boş satır gelmeyen her tekil satır sonunu boşluğa çevirir
 * (PDF'ten kopyalanmış metinler için).
 */
export function joinSingleLines(text: string): string {
  return text.replace(/([^\n])\n(?!\n)/g, "$1 ");
}
