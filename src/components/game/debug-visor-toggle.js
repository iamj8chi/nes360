// Cubo blanco interactuable detrás del cartel grande (#mainCartelGrande). Al
// clickearlo (mouse en desktop, hand-ray en VR) togglea el "visor de debug": muestra
// u oculta TANTO los volúmenes de colisión (window.COLLISION_DEBUG) COMO los spawn
// points invisibles (window.SPAWN_DEBUG). Ambos flags se mantienen sincronizados.
//
// Reemplaza en la práctica al toggle por teclado Ctrl+C (que sigue existiendo en
// collision-manager, solo para colisiones) con algo usable dentro del headset.

AFRAME.registerComponent("debug-visor-toggle", {
  init: function () {
    this.el.addEventListener("mouseenter", () => {
      this.el.setAttribute("material", "color", "#FFFF00");
    });
    this.el.addEventListener("mouseleave", () => {
      this.el.setAttribute("material", "color", "#FFFFFF");
    });

    this.el.addEventListener("click", () => {
      const on = !window.SPAWN_DEBUG;
      window.SPAWN_DEBUG = on;
      window.COLLISION_DEBUG = on;
      console.log(`Debug visor: ${on ? "ON" : "OFF"}`);

      // Refresca colisiones (recorre y llama updateDebugVisibility en cada collider).
      const cm = this.el.sceneEl.components["collision-manager"];
      if (cm) cm.updateColliders();

      // Refresca spawn points.
      document.querySelectorAll("[spawn-point]").forEach((el) => {
        const sp = el.components && el.components["spawn-point"];
        if (sp) sp.updateDebugVisibility();
      });

      // Feedback: verde un instante.
      this.el.setAttribute("material", "color", "#00FF00");
      setTimeout(() => {
        this.el.setAttribute("material", "color", "#FFFFFF");
      }, 600);
    });
  },
});
