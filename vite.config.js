import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

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

export default defineConfig({
  // basic-ssl serves the dev/preview server over HTTPS with a self-signed cert.
  // Required for WebXR on a headset reached over the LAN (http only works on
  // localhost). The headset browser will warn once about the untrusted cert — accept it.
  plugins: noSsl ? [] : [basicSsl()],
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
  },
});
