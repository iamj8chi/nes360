// Carga perezosa y memoizada de lottie-web + de los JSON de animación.
//
// Este módulo NO toca los globales AFRAME/THREE a propósito: lo comparten la
// superficie VR (lottie-plane) y la superficie DOM (animal-info-card), y así la
// librería se descarga UNA vez y cada JSON se parsea UNA vez.
//
// El import es dinámico para que Rollup lo emita en un chunk aparte: con el spike
// apagado (animal-info-card="spike: none", el default) no se descarga ni un byte
// de lottie. Ver CLAUDE.md §8 gap 5 (el bundle main ya pesa 1.39 MB).
//
// Usamos el build "light canvas": sin renderer SVG/HTML y sin motor de
// expresiones. El JSON del gato es shape-only (assets: [], sin expresiones, sin
// mattes), así que este build lo dibuja igual que el completo, por la mitad de peso.

let libPromise = null;
const animCache = new Map();

export function loadLottieLib() {
  if (!libPromise) {
    libPromise =
      import("lottie-web/build/player/lottie_light_canvas.min.js").then(
        (mod) => {
          // Los builds de build/player/* son UMD: según cómo los interprete Vite el
          // objeto puede venir en .default, en .lottie o solo en window.lottie.
          const lottie = mod.default || mod.lottie || window.lottie;
          if (!lottie || typeof lottie.loadAnimation !== "function") {
            throw new Error("lottie-web cargó pero no expone loadAnimation()");
          }
          return lottie;
        }
      );
  }
  return libPromise;
}

export function fetchLottie(url) {
  if (!animCache.has(url)) {
    animCache.set(
      url,
      fetch(url).then((res) => {
        if (!res.ok) {
          throw new Error(`No se pudo cargar el Lottie ${url}: ${res.status}`);
        }
        return res.json();
      })
    );
  }
  return animCache.get(url);
}
