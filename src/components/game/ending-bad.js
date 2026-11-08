import { cameraYaw, placeRigAt } from "../../utils/place-rig.js";

// ending-bad — FINAL MALO del Safari (se acabó el tiempo). En #endingBad.
//
// Guion: fade a negro → los animales se reúnen en círculo al lado del jugador, sale
// el logo "No Están Solos" con "No los salvaste a todos, intenta nuevamente." → fade
// a negro y vuelta al menú. Solo aparecen los animales que SALVÓ: los huecos del
// círculo marcan a los que faltaron (con 0 encontrados quedan solo el logo y el
// texto). La secuencia la lleva safari-game-manager (playEnding); la locomoción la
// apaga cinematic-lock.
//
// Pasa en la isla, en medio del bosque quemado (p = 1, el fuego sigue sonando):
// environment-degradation no restaura hasta safari-game-ended.
//
// safari-ending-started {won: false, found} (llega a negro):
//  - rota #endingBad al rumbo de la mirada actual, así el hueco del círculo y el
//    logo quedan adelante, y lleva al jugador al centro (#endingBadAnchor);
//  - muestra los animales encontrados (hijos con data-animal-type) con un pop
//    escalonado. Solo hay clip `idle`, no hay caminata de entrada;
//  - hace aparecer logo y texto.
// safari-game-ended (a negro): oculta todo y lo deja como estaba.
//
// Igual que ending-good, el grupo arranca PAUSADO y solo corre durante el final.

AFRAME.registerComponent("ending-bad", {
  schema: {
    anchor: { type: "selector", default: "#endingBadAnchor" },
    logo: { type: "selector", default: "#endingBadLogo" },
    text: { type: "selector", default: "#endingBadText" },
    textBg: { type: "selector", default: "#endingBadTextBg" },
    textBgOpacity: { type: "number", default: 0.6 },
    popDelay: { type: "number", default: 1300 }, // tras el negro (≈ fin del fade-in)
    popStagger: { type: "number", default: 250 },
    logoDelay: { type: "number", default: 1800 },
    textDelay: { type: "number", default: 2800 },
  },

  init: function () {
    this.active = false;
    this.animals = [];
    this.baseScales = [];

    this.onEndingStarted = this.onEndingStarted.bind(this);
    this.onEnded = this.onEnded.bind(this);
    this.el.sceneEl.addEventListener(
      "safari-ending-started",
      this.onEndingStarted
    );
    this.el.sceneEl.addEventListener("safari-game-ended", this.onEnded);

    setTimeout(() => {
      this.animals = Array.from(this.el.querySelectorAll("[data-animal-type]"));
      this.baseScales = this.animals.map((el) => el.object3D.scale.clone());
    }, 100);

    const scene = this.el.sceneEl;
    const pause = () => {
      if (!this.active) this.el.pause();
    };
    if (scene.renderStarted) pause();
    else scene.addEventListener("renderstart", pause, { once: true });
  },

  onEndingStarted: function (evt) {
    if (!evt.detail || evt.detail.won) return;
    this.active = true;
    const found = new Set(evt.detail.found || []);

    // Orientar el grupo hacia donde mira el jugador y llevarlo al centro sin
    // cambiarle el rumbo (en VR no se puede girar al jugador real).
    const yaw = cameraYaw(this.el.sceneEl);
    this.el.object3D.rotation.set(0, yaw, 0);

    const rig = document.getElementById("cameraRig");
    const anchor = this.data.anchor || this.el;
    if (rig) {
      const target = new THREE.Vector3();
      anchor.object3D.getWorldPosition(target);
      placeRigAt(rig, target, yaw);
    }

    this.el.setAttribute("visible", "true");
    this.el.play();

    // Solo los salvados, con un pop escalonado ("se reúnen").
    let n = 0;
    this.animals.forEach((el, i) => {
      const saved = found.has(el.dataset.animalType);
      el.setAttribute("visible", saved ? "true" : "false");
      if (!saved) return;
      const s = this.baseScales[i];
      el.object3D.scale.set(0.001, 0.001, 0.001);
      el.setAttribute("animation__pop", {
        property: "scale",
        from: "0.001 0.001 0.001",
        to: `${s.x} ${s.y} ${s.z}`,
        delay: this.data.popDelay + n * this.data.popStagger,
        dur: 600,
        easing: "easeOutBack",
      });
      n++;
    });

    const d = this.data;
    this.fadeIn(d.logo, "material", d.logoDelay, 1);
    this.fadeIn(d.textBg, "material", d.textDelay, d.textBgOpacity);
    this.fadeIn(d.text, "text", d.textDelay, 1);
  },

  // Anima `<comp>.opacity` de 0 a `to` (material de a-image/a-plane, text de a-text).
  fadeIn: function (el, comp, delay, to) {
    if (!el) return;
    el.setAttribute(comp, "opacity", 0);
    el.setAttribute("animation__appear", {
      property: `${comp}.opacity`,
      from: 0,
      to,
      delay,
      dur: 1200,
      easing: "easeOutQuad",
    });
  },

  onEnded: function () {
    if (!this.active) return;
    this.active = false;

    this.animals.forEach((el, i) => {
      el.removeAttribute("animation__pop");
      const s = this.baseScales[i];
      if (s) el.object3D.scale.copy(s);
      el.setAttribute("visible", "false");
    });
    [
      [this.data.logo, "material"],
      [this.data.textBg, "material"],
      [this.data.text, "text"],
    ].forEach(([el, comp]) => {
      if (!el) return;
      el.removeAttribute("animation__appear");
      el.setAttribute(comp, "opacity", 0);
    });

    this.el.setAttribute("visible", "false");
    this.el.pause();
  },

  remove: function () {
    this.el.sceneEl.removeEventListener(
      "safari-ending-started",
      this.onEndingStarted
    );
    this.el.sceneEl.removeEventListener("safari-game-ended", this.onEnded);
  },
});
