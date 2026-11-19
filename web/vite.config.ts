/**
 * `npm run web:build` / `web:dev` komutları Vite'a kök olarak `web` verdiği için
 * Vite yapılandırmayı bu klasörde arar. Tek doğruluk kaynağı kök `vite.config.ts`
 * dosyasıdır; bu köprü yalnızca onu yeniden dışa aktarır.
 */
export { default } from "../vite.config.js";
