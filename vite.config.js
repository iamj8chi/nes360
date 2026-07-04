import { defineConfig } from "vite";
import { resolve } from "path";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

// index.html at the project root is the Vite entry point.
// Static assets live in public/ and are served verbatim at "/" (e.g. models in
// /assets/models/foo.glb), so A-Frame's <a-asset-item src="assets/..."> URLs work
// in both dev and build.
// Deploy target is Vercel at the domain root, so the default base "/" is correct.
// Opt out of HTTPS with NO_SSL=1 (see the `inspect` script). The A-Frame Inspector +
// aframe-watcher save over plain HTTP at localhost:51234; from an HTTPS page that POST
// is blocked as mixed content ("aframe-watcher not running"). Serving over HTTP on
// localhost lets the Inspector's Save reach the watcher. Keep HTTPS for VR/LAN testing.
const noSsl = process.env.NO_SSL === "1";

// La página AR vive en ar/index.html, así que se sirve en "/ar/" (con barra). Sin la
// barra, "/ar" no matchea ningún archivo y cae en el fallback SPA de Vite → sirve el
// index.html raíz (el juego principal). Este middleware redirige "/ar" → "/ar/" para
// que la URL funcione de las dos formas, en dev y en preview.
function arTrailingSlashRedirect() {
  const redirect = (req, res, next) => {
    const url = (req.url || "").split("?")[0];
    if (url === "/ar") {
      res.writeHead(301, { Location: "/ar/" });
      res.end();
      return;
    }
    next();
  };
  return {
    name: "ar-trailing-slash-redirect",
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

// PWA: hace la web instalable y offline-capable, prerequisito para empaquetarla
// como APK (TWA / Bubblewrap fork de Meta) y sideloadearla en Meta Quest. El SW
// (Workbox) precachea TODO el juego —incluidos los .glb/.mp3 de public/assets—
// para que tras el primer arranque con red corra 100% offline. `devOptions` queda
// deshabilitado (default): el SW solo existe en el build de producción, así el dev
// server (HMR) no se ve afectado ni sirve assets stale. Ver README/§9 de CLAUDE.md.
const pwa = VitePWA({
  registerType: "autoUpdate",
  injectRegister: "auto",
  manifest: {
    name: "No Están Solos",
    short_name: "No Están Solos",
    description:
      "Safari VR 360° por la sabana del Chaco: encontrá y salvá a los 6 animales nativos amenazados.",
    lang: "es",
    start_url: "/",
    scope: "/",
    // fullscreen: sin barras de sistema en el headset; ideal para inmersivo.
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#0d1f12",
    theme_color: "#1f3a24",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  },
  workbox: {
    // Precachear también los assets pesados de public/ (Workbox globa dist/): sin
    // incluir glb/mp3/etc. el juego NO cargaría offline.
    globPatterns: [
      "**/*.{js,css,html,json,glb,gltf,bin,mp3,wav,ogg,png,jpg,jpeg,svg,ico,woff,woff2,ttf}",
    ],
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    // La página WebAR (/ar) carga A-Frame/AR.js por CDN (no cachea offline) y no es
    // objetivo del APK VR; que su precache no caiga en el shell del juego.
    navigateFallbackDenylist: [/^\/ar\//],
  },
});

export default defineConfig({
  // basic-ssl serves the dev/preview server over HTTPS with a self-signed cert.
  // Required for WebXR on a headset reached over the LAN (http only works on
  // localhost). The headset browser will warn once about the untrusted cert — accept it.
  plugins: noSsl
    ? [arTrailingSlashRedirect(), pwa]
    : [basicSsl(), arTrailingSlashRedirect(), pwa],
  // Dev server: fixed port 3333, always exposed on the local network (host: true
  // binds 0.0.0.0 so headsets/phones on the same Wi-Fi can reach it). `preview`
  // mirrors the same settings for `npm run preview`.
  server: {
    port: 3333,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 3333,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Multipage: el juego principal (index.html) y el minijuego WebAR (ar/index.html)
    // se construyen juntos en un solo build/deploy. La página /ar carga A-Frame+AR.js
    // por CDN y su propio entry (src/ar/main.js); comparte public/assets con el juego.
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        ar: resolve(__dirname, "ar/index.html"),
      },
    },
  },
});
