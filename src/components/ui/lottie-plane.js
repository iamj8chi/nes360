import { loadLottieLib, fetchLottie } from "../../utils/lottie-loader.js";

// lottie-plane — dibuja una animación Lottie/Bodymovin sobre un plano de la escena.
//
// Cómo: lottie-web (renderer "canvas") pinta en un canvas 2D DESPEGADO del DOM, y
// ese canvas se mapea como THREE.CanvasTexture sobre un PlaneGeometry. Es el mismo
// patrón canvas→textura que usa createVignette() en environment-degradation.js, el
// único precedente del repo.
//
// El componente es genérico ("un Lottie en un plano"), no sabe nada del gato: la
// animación concreta se pasa por el atributo `src`.
//
// ⚠️ tick, no requestAnimationFrame: dentro de una sesión WebXR inmersiva en Quest
// el rAF de window NO se atiende de forma fiable (los frames los entrega
// XRSession.requestAnimationFrame, que es lo que mueve el tick de A-Frame). Un
// lottie con autoplay se congela al entrar a VR. Por eso autoplay:false + goToAndStop
// desde tick.
//
// ⚠️ No lo importes desde src/ar/main.js: toca el global AFRAME y Rollup lo sacaría
// a un chunk compartido que se evalúa ANTES de A-Frame → pantalla en blanco solo en
// producción (CLAUDE.md §10, último bullet).

AFRAME.registerComponent("lottie-plane", {
  schema: {
    src: { type: "string", default: "" },
    width: { type: "number", default: 0.4 }, // metros
    height: { type: "number", default: 0 }, // 0 = derivar del aspecto del JSON
    resolution: { type: "number", default: 512 }, // ancho del canvas en px
    fps: { type: "number", default: 30 },
    loop: { type: "boolean", default: true },
    renderOrder: { type: "number", default: 999 },
    doubleSide: { type: "boolean", default: true },
  },

  init: function () {
    this._ready = false;
    this._loading = false;
    this._running = true;
    this._destroyed = false;
    this._elapsed = 0;
    this._lastFrame = -1;
    this._totalFrames = 1;
    this.anim = null;

    this.buildMesh();
    // OJO: NO cargamos acá. La carga es perezosa, en el primer tick en que el
    // entity está visible (ver tick). Si cargáramos en init, el chunk de lottie y
    // el JSON se bajarían en CADA arranque aunque el spike esté apagado, que es
    // justo lo que el import dinámico busca evitar.
  },

  // Malla inmediata con una textura placeholder transparente: así el entity ya
  // tiene su object3D "mesh" antes de que resuelva la carga async (y render-on-top,
  // que hace traverse, lo encuentra).
  buildMesh: function () {
    const d = this.data;

    this.canvas = document.createElement("canvas"); // DESPEGADO: nunca va al DOM
    this.canvas.width = 1;
    this.canvas.height = 1;
    // Sin { alpha: false }: es la causa nº1 de que el plano salga negro.
    this.ctx = this.canvas.getContext("2d");

    this.texture = new THREE.CanvasTexture(this.canvas);
    // Mismo guard que environment-degradation.js: A-Frame trae su propia THREE
    // (super-three) y la escena corre con colorManagement: true; sin esto los
    // colores salen lavados.
    if ("SRGBColorSpace" in THREE) {
      this.texture.colorSpace = THREE.SRGBColorSpace;
    }
    // Sin mipmaps: cada needsUpdate regeneraría toda la cadena de mips (caro en VR).
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: d.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      // Igual que la ficha VR: HUD pegado a la mano, nunca ocluido por profundidad.
      depthTest: false,
      depthWrite: false,
    });
    // Si aparecen halos oscuros en los bordes antialiaseados, activar LAS DOS:
    // this.texture.premultiplyAlpha = true; this.material.premultipliedAlpha = true;

    const h = d.height > 0 ? d.height : d.width;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(d.width, h),
      this.material
    );
    mesh.renderOrder = d.renderOrder;
    mesh.frustumCulled = false;
    this.mesh = mesh;
    // setObject3D (no object3D.add) para que A-Frame lo vea y el remove sea limpio.
    this.el.setObject3D("mesh", mesh);
  },

  loadAnimation: async function () {
    const d = this.data;
    if (!d.src) {
      console.warn("lottie-plane: falta el atributo src");
      return;
    }
    this._loading = true;
    try {
      const [lottie, animationData] = await Promise.all([
        loadLottieLib(),
        fetchLottie(d.src),
      ]);
      // El entity puede haberse removido durante los await.
      if (this._destroyed) return;

      const srcW = animationData.w || 512;
      const srcH = animationData.h || 512;
      const aspect = srcW / srcH;

      // Canvas al tamaño pedido, manteniendo el aspecto del JSON.
      this.canvas.width = Math.round(d.resolution);
      this.canvas.height = Math.round(d.resolution / aspect);

      // Geometría con el mismo aspecto (salvo height explícito).
      const planeH = d.height > 0 ? d.height : d.width / aspect;
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(d.width, planeH);

      this.anim = lottie.loadAnimation({
        renderer: "canvas",
        loop: d.loop,
        autoplay: false, // lo movemos nosotros desde tick (ver cabecera)
        animationData: animationData,
        rendererSettings: {
          context: this.ctx,
          scaleMode: "noScale",
          clearCanvas: true, // limpia a alpha 0 cada frame → fondo transparente
        },
      });

      this._totalFrames = Math.max(1, Math.round(this.anim.totalFrames));
      this._ready = true;
      this._lastFrame = -1;
    } catch (err) {
      console.error("lottie-plane: no se pudo inicializar", d.src, err);
    } finally {
      this._loading = false;
    }
  },

  tick: function (time, timeDelta) {
    if (!this._running) return;
    // A-Frame NO deja de tickear un entity invisible: sin este guard el canvas se
    // repintaría 30 veces por segundo con la ficha oculta.
    if (!this.el.object3D.visible) return;

    // Carga perezosa: recién al hacerse visible por primera vez bajamos lottie y
    // el JSON. Con el spike apagado esto nunca ocurre y no cuesta nada.
    if (!this._ready) {
      if (!this._loading && !this._destroyed) this.loadAnimation();
      return;
    }

    this._elapsed += timeDelta;
    // Frame derivado del tiempo absoluto (no acumulador con módulo): no acumula
    // deriva, y el test "¿cambió el frame?" ES el throttle.
    const frame =
      Math.floor((this._elapsed / 1000) * this.data.fps) % this._totalFrames;
    if (frame === this._lastFrame) return;
    this._lastFrame = frame;

    this.anim.goToAndStop(frame, true); // true = es un nº de frame; repinta sincrónico
    this.texture.needsUpdate = true; // exactamente una subida por frame de origen
  },

  play: function () {
    this._running = true;
  },

  pause: function () {
    this._running = false;
  },

  update: function (oldData) {
    // Spike: ante cualquier cambio relevante, rehacer. Sin matriz de diffs.
    if (!oldData || Object.keys(oldData).length === 0) return;
    const d = this.data;
    const changed =
      oldData.src !== d.src ||
      oldData.resolution !== d.resolution ||
      oldData.width !== d.width ||
      oldData.height !== d.height ||
      oldData.loop !== d.loop;
    if (!changed) return;

    if (this.anim) {
      this.anim.destroy();
      this.anim = null;
    }
    this._ready = false;
    this._elapsed = 0;
    this._lastFrame = -1;
    // No recargamos acá: el próximo tick visible lo hace (misma pereza que init).
  },

  remove: function () {
    this._destroyed = true;
    this._ready = false;
    if (this.anim) {
      this.anim.destroy();
      this.anim = null;
    }
    if (this.mesh) {
      this.el.removeObject3D("mesh");
      this.mesh.geometry.dispose();
    }
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();
    this.canvas = null;
    this.ctx = null;
  },
});
