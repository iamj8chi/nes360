import { placeRigAt, worldYaw } from "../../utils/place-rig.js";

// ending-good — FINAL BUENO del Safari (encontró a los 6 a tiempo). En #endingGood.
//
// Guion: fade a negro → el jugador va en la caja de una camioneta, entre las jaulas
// con los 6 animales salvados, por un camino de tierra que se aleja del incendio.
// Adelante, del lado que no se quema, aparece el logo "No Están Solos". Fade a negro
// y vuelta al menú. La secuencia (fades + duración) la lleva safari-game-manager
// (playEnding); la locomoción la apaga cinematic-lock; el camino lo mueve
// ending-treadmill.
//
// safari-ending-started {won: true} (llega a negro):
//  - muestra el escenario (#endingGood, lejos de la isla) y oculta la isla
//    (WORLD_IDS): perf VR, y para que la niebla no dibuje su silueta en el horizonte;
//  - sube al jugador a la caja (#endingGoodSeat) mirando hacia adelante;
//  - pone su niebla y su cielo (degradé: azul adelante, rojo atrás);
//  - hace aparecer el logo (#endingGoodLogo) a los `logoDelay` ms.
// safari-game-ended (también a negro, sea fin normal o skip): desarma todo.
//
// El escenario arranca PAUSADO (sin tick de mixers, fuego ni viento mientras está
// oculto) y solo corre durante el final.

// Entities de la isla que se ocultan mientras dura el final. Los sets de animales
// los maneja game-modes; los carteles ya están ocultos desde startGame.
const WORLD_IDS = ["scenario", "trees", "floor", "sky"];

// Colores del cielo del final (sRGB). Se mezclan por vértice: adelante (−Z) cielo
// limpio, atrás (+Z) el resplandor del incendio.
// El de adelante es bastante saturado a propósito: el logo es blanco y sobre un
// celeste pálido casi no se leía.
const SKY_FRONT_HORIZON = "#9fd2ec";
const SKY_FRONT_ZENITH = "#3f8fcc";
const SKY_BACK_HORIZON = "#ff7a2a";
const SKY_BACK_ZENITH = "#5a1a08";

AFRAME.registerComponent("ending-good", {
  schema: {
    seat: { type: "selector", default: "#endingGoodSeat" },
    logo: { type: "selector", default: "#endingGoodLogo" },
    logoDelay: { type: "number", default: 3000 },
    logoFade: { type: "number", default: 1500 },
    fogColor: { type: "color", default: "#f2dcae" },
    fogDensity: { type: "number", default: 0.012 },
    skyRadius: { type: "number", default: 250 },
  },

  init: function () {
    this.active = false;
    this.savedFogDensity = null;

    this.onEndingStarted = this.onEndingStarted.bind(this);
    this.onEnded = this.onEnded.bind(this);
    this.el.sceneEl.addEventListener(
      "safari-ending-started",
      this.onEndingStarted
    );
    this.el.sceneEl.addEventListener("safari-game-ended", this.onEnded);

    this.createSky();
    this.pauseWhenReady();
  },

  // Pausar recién cuando la escena ya arrancó: si se pausa antes, el play() inicial
  // de la escena (que recorre todos los hijos) lo vuelve a poner en marcha.
  pauseWhenReady: function () {
    const scene = this.el.sceneEl;
    const pause = () => {
      if (!this.active) this.el.pause();
    };
    if (scene.renderStarted) pause();
    else scene.addEventListener("renderstart", pause, { once: true });
  },

  // Esfera de cielo propia con degradé por vértice: no depende del mapeo UV de
  // a-sky, y el "adelante" es siempre −Z local, igual que la camioneta.
  createSky: function () {
    const r = this.data.skyRadius;
    const geo = new THREE.SphereGeometry(r, 48, 24);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const fH = new THREE.Color(SKY_FRONT_HORIZON);
    const fZ = new THREE.Color(SKY_FRONT_ZENITH);
    const bH = new THREE.Color(SKY_BACK_HORIZON);
    const bZ = new THREE.Color(SKY_BACK_ZENITH);
    const front = new THREE.Color();
    const back = new THREE.Color();
    const c = new THREE.Color();
    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / r; // −1..1
      const z = pos.getZ(i) / r; // −1 adelante .. +1 atrás
      const up = smooth(0, 0.6, y);
      front.copy(fH).lerp(fZ, up);
      back.copy(bH).lerp(bZ, smooth(0, 0.8, y));
      c.copy(front).lerp(back, smooth(-0.1, 0.85, z));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -1; // antes que todo, como un a-sky
    this.el.object3D.add(mesh);
  },

  onEndingStarted: function (evt) {
    if (!evt.detail || !evt.detail.won) return;
    this.active = true;
    const scene = this.el.sceneEl;

    WORLD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("visible", "false");
    });

    this.el.setAttribute("visible", "true");
    this.el.play();

    // Niebla más rala que en la isla: el fondo del incendio está a ~30 m y con la
    // densidad del juego (0.02) quedaba lavado. El color lo restaura
    // environment-degradation en safari-game-ended; la densidad, este componente.
    const fog = scene.getAttribute("fog");
    this.savedFogDensity = fog ? fog.density : null;
    scene.setAttribute("fog", {
      color: this.data.fogColor,
      density: this.data.fogDensity,
    });

    // Al jugador, a la caja, mirando hacia donde mira el asiento (−Z de la camioneta).
    const seat = this.data.seat;
    const rig = document.getElementById("cameraRig");
    if (seat && rig) {
      const target = new THREE.Vector3();
      seat.object3D.getWorldPosition(target);
      placeRigAt(rig, target, worldYaw(seat.object3D));
    }

    // Logo: aparece después de unos segundos de viaje.
    const logo = this.data.logo;
    if (logo) {
      logo.setAttribute("material", "opacity", 0);
      logo.setAttribute("animation__appear", {
        property: "material.opacity",
        from: 0,
        to: 1,
        delay: this.data.logoDelay,
        dur: this.data.logoFade,
        easing: "easeOutQuad",
      });
    }
  },

  onEnded: function () {
    if (!this.active) return;
    this.active = false;
    const scene = this.el.sceneEl;

    WORLD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("visible", "true");
    });

    if (this.savedFogDensity != null) {
      scene.setAttribute("fog", "density", this.savedFogDensity);
    }

    const logo = this.data.logo;
    if (logo) {
      logo.removeAttribute("animation__appear");
      logo.setAttribute("material", "opacity", 0);
    }

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
