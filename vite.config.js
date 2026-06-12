import { defineConfig } from "vite";

// index.html at the project root is the Vite entry point.
// Static assets live in public/ and are served verbatim at "/" (e.g. /assets/foo.glb),
// so A-Frame's <a-asset-item src="assets/..."> URLs work in both dev and build.
// Deploy target is Vercel at the domain root, so the default base "/" is correct.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
