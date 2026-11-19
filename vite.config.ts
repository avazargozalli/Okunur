import { defineConfig } from "vite";

/**
 * Şartname 10.1: üretimde tam CSP. Vite'ın geliştirme sunucusu HMR için WebSocket
 * kullandığından yalnızca `serve` kipinde `connect-src` genişletilir; derleme çıktısı
 * index.html içindeki üretim CSP'sini olduğu gibi korur.
 */
const PRODUCTION_CSP =
  "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'";

const DEVELOPMENT_CSP =
  "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; base-uri 'none'; form-action 'none'";

export default defineConfig({
  root: "web",
  base: "/okunur/",
  build: {
    outDir: "../dist-web",
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "okunur-dev-csp",
      apply: "serve",
      transformIndexHtml(html) {
        return html.replace(PRODUCTION_CSP, DEVELOPMENT_CSP);
      },
    },
  ],
});
