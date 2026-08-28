// Toggle del "visor de debug": muestra u oculta TANTO los volúmenes de colisión
// (window.COLLISION_DEBUG) COMO los spawn points invisibles (window.SPAWN_DEBUG),
// manteniendo los dos flags sincronizados.
//
// Dos vías:
//  - **Ctrl+D** (teclado), la única disponible hoy: el cubo blanco detrás del cartel
//    grande está `visible="false"` para no ensuciar la escena publicada, y un entity
//    invisible tampoco recibe raycast, así que no se puede clickear. Para volver a
//    tenerlo dentro del headset alcanza con quitarle el `visible="false"`.
//  - Click en ese cubo (mouse o hand-ray) si se lo vuelve a hacer visible.
//
// Ctrl+C sigue existiendo aparte en collision-manager, solo para colisiones.

AFRAME.registerComponent("debug-visor-toggle", {
  init: function () {
    this.toggle = this.toggle.bind(this);

    this.onKeyDown = (e) => {
      // Ctrl+D: preventDefault corta el diálogo de marcador del navegador.
      if (e.code === "KeyD" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener("keydown", this.onKeyDown);

    this.el.addEventListener("mouseenter", () => {
      this.el.setAttribute("material", "color", "#FFFF00");
    });
    this.el.addEventListener("mouseleave", () => {
      this.el.setAttribute("material", "color", "#FFFFFF");
    });

    this.el.addEventListener("click", this.toggle);
  },

  toggle: function () {
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

    // Feedback: verde un instante (solo se ve si el cubo está visible).
    this.el.setAttribute("material", "color", "#00FF00");
    setTimeout(() => {
      this.el.setAttribute("material", "color", "#FFFFFF");
    }, 600);
  },

  remove: function () {
    window.removeEventListener("keydown", this.onKeyDown);
  },
});
