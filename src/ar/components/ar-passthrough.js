// ar-passthrough — garantiza que el canvas WebGL sea TRANSPARENTE para que el video
// de la cámara (que AR.js coloca detrás) se vea. AR.js normalmente pone el clearAlpha
// del renderer en 0, pero según la versión de A-Frame puede quedar en 1 → el canvas se
// limpia a negro opaco cada frame y tapa el video: se ve todo negro aunque el tracking
// funcione y los modelos aparezcan. Va en <a-scene>.

AFRAME.registerComponent("ar-passthrough", {
  init: function () {
    const apply = () => {
      const r = this.el.renderer;
      if (!r) return;
      // clearColor negro con alpha 0 = transparente; el video de atrás queda visible.
      r.setClearColor(0x000000, 0);
      r.autoClear = true;
    };
    if (this.el.renderer) apply();
    // El renderer puede no existir todavía en init; reintentar al cargar la escena.
    this.el.addEventListener("loaded", apply);
    this.el.addEventListener("render-target-loaded", apply);
    // Y un par de reintentos por si AR.js reajusta el renderer al iniciar la cámara.
    setTimeout(apply, 500);
    setTimeout(apply, 1500);
  },
});
