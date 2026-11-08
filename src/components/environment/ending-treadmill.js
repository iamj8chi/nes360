// ending-treadmill — en #endingScenery (final bueno). La camioneta NO se mueve: el
// mundo pasa. Es la técnica de confort VR para vehículos: velocidad constante, sin
// aceleración, y la camioneta como marco fijo alrededor del jugador.
//
// Dos cosas por frame, solo mientras el final bueno está activo:
//  1. Los hijos con clase `ending-prop` (árboles, pasto, arbustos) avanzan en +Z
//     (hacia atrás de la camioneta, que mira a −Z). Cuando pasan `behind` se los
//     vuelve a mandar `length` metros adelante; la niebla tapa el pop-in.
//  2. El `offset` de la textura del camino (`road`) se desplaza a la misma
//     velocidad, así la tierra "corre" bajo las ruedas.
//
// Las posiciones del HTML son las iniciales (editables con el Inspector). Al
// terminar el final se restauran, para que cada vuelta arranque igual.
//
// Escucha safari-ending-started {won} / safari-game-ended igual que ending-good.

// Metros de camino que cubre UNA repetición de la textura de tierra.
const ROAD_TILE_METERS = 6;

AFRAME.registerComponent("ending-treadmill", {
  schema: {
    speed: { type: "number", default: 8 }, // m/s (~30 km/h)
    length: { type: "number", default: 200 }, // largo del ciclo de reciclado
    behind: { type: "number", default: 40 }, // z local a partir de la cual se recicla
    road: { type: "selector", default: "#endingRoad" },
  },

  init: function () {
    this.active = false;
    this.props = [];
    this.initialZ = [];
    this.roadTexture = null;

    this.onEndingStarted = this.onEndingStarted.bind(this);
    this.onEnded = this.onEnded.bind(this);
    this.el.sceneEl.addEventListener(
      "safari-ending-started",
      this.onEndingStarted
    );
    this.el.sceneEl.addEventListener("safari-game-ended", this.onEnded);

    setTimeout(() => {
      this.props = Array.from(this.el.querySelectorAll(".ending-prop"));
      this.initialZ = this.props.map((el) => el.object3D.position.z);
      this.setupRoad();
    }, 100);
  },

  // Textura de tierra generada en canvas (sin asset nuevo): base marrón con
  // grumos y dos huellas de rueda más oscuras. RepeatWrapping a lo largo del
  // camino, y el tick le corre el offset.
  setupRoad: function () {
    const roadEl = this.data.road;
    if (!roadEl) return;

    const w = 128;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#9a7650";
    ctx.fillRect(0, 0, w, h);

    // Grumos/piedritas: el detalle es lo que hace visible el movimiento.
    for (let i = 0; i < 420; i++) {
      const shade = Math.random() < 0.5 ? "#7d5d3c" : "#b38d62";
      ctx.fillStyle = shade;
      const s = 1 + Math.random() * 3;
      ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    // Huellas de rueda.
    ctx.fillStyle = "rgba(70, 50, 30, 0.35)";
    ctx.fillRect(w * 0.2, 0, w * 0.12, h);
    ctx.fillRect(w * 0.68, 0, w * 0.12, h);

    const tex = new THREE.CanvasTexture(canvas);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.roadTexture = tex;

    const apply = () => {
      const mesh = roadEl.getObject3D("mesh");
      if (!mesh) return;
      const geo = roadEl.getAttribute("geometry") || {};
      tex.repeat.set(1, (geo.height || 300) / ROAD_TILE_METERS);
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    };
    if (roadEl.getObject3D("mesh")) apply();
    else roadEl.addEventListener("object3dset", apply, { once: true });
  },

  onEndingStarted: function (evt) {
    if (!evt.detail || !evt.detail.won) return;
    this.active = true;
  },

  onEnded: function () {
    if (!this.active) return;
    this.active = false;
    this.props.forEach((el, i) => {
      el.object3D.position.z = this.initialZ[i];
    });
    if (this.roadTexture) this.roadTexture.offset.y = 0;
  },

  tick: function (time, delta) {
    if (!this.active || !delta) return;
    const dz = (this.data.speed * delta) / 1000;
    const { behind, length } = this.data;

    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i].object3D.position;
      p.z += dz;
      if (p.z > behind) p.z -= length;
    }

    // El plano está rotado −90° en X: la V de la textura crece hacia −Z (adelante).
    // Subir el offset corre los detalles hacia +Z, o sea hacia atrás. Igual que
    // los props.
    if (this.roadTexture) {
      const t = this.roadTexture;
      t.offset.y = (t.offset.y + dz / ROAD_TILE_METERS) % 1;
    }
  },

  remove: function () {
    this.el.sceneEl.removeEventListener(
      "safari-ending-started",
      this.onEndingStarted
    );
    this.el.sceneEl.removeEventListener("safari-game-ended", this.onEnded);
  },
});
