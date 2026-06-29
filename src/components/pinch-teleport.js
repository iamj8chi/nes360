// pinch-teleport — locomoción de CAMINAR con manos (WebXR hand tracking). Vive en el
// #cameraRig, junto a vr-locomotion (thumbstick) y flight-locomotion (aleteo).
//
// Reemplaza al thumbstick cuando el jugador usa las manos desnudas: apuntar al suelo con
// la mano elegida y hacer pinch (juntar índice + pulgar) teletransporta el rig al punto.
// Coexiste sin conflicto con vr-locomotion: el thumbstick solo dispara `axismove` (mandos)
// y el teleport solo `pinchstarted/ended` (manos), así que nunca compiten.
//
// Mano dedicada para evitar choque con la SELECCIÓN (el cursor también usa pinch como
// click): por defecto el teleport escucha solo la mano IZQUIERDA, y además se inhibe si en
// ese frame el raycaster de esa mano está intersecando un .clickable/.animal (la UI manda).
//
// Flag de runtime `this.enabled` (igual que vr-locomotion): vuelo-mode lo apaga durante el
// vuelo para que el pinch quede libre para coleccionar animales y el avance sea por aleteo.
AFRAME.registerComponent("pinch-teleport", {
  schema: {
    hand: { type: "string", default: "left" }, // 'left' | 'right'
    maxRange: { type: "number", default: 60 }, // radio máx desde el centro del mapa
    markerId: { type: "string", default: "teleportMarker" },
  },

  init: function () {
    this.enabled = true; // runtime; vuelo-mode lo togglea
    this.aiming = false; // pinch en curso
    this.hasTarget = false; // hay un punto de destino válido este frame

    this.handEl = null;
    this.marker = null;
    this.collisionManager = null;

    this.handPos = new THREE.Vector3();
    this.handDir = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y = 0
    this.ray = new THREE.Ray();

    this.onPinchStart = this.onPinchStart.bind(this);
    this.onPinchEnd = this.onPinchEnd.bind(this);

    // Esperar a que el grafo esté listo (mismo patrón que el resto, ver CLAUDE.md §5).
    setTimeout(() => this.resolveRefs(), 100);
  },

  resolveRefs: function () {
    const handId = this.data.hand === "right" ? "rightHand" : "leftHand";
    this.handEl = document.getElementById(handId);
    this.marker = document.getElementById(this.data.markerId);
    this.collisionManager =
      this.el.sceneEl && this.el.sceneEl.components["collision-manager"];

    if (this.handEl) {
      this.handEl.addEventListener("pinchstarted", this.onPinchStart);
      this.handEl.addEventListener("pinchended", this.onPinchEnd);
    }
  },

  onPinchStart: function () {
    if (!this.enabled) return;
    // Prioridad a la UI: si la mano apunta a algo clickable, este pinch es un click,
    // no un teleport.
    const rc = this.handEl && this.handEl.components.raycaster;
    if (rc && rc.intersectedEls && rc.intersectedEls.length > 0) return;
    this.aiming = true;
  },

  onPinchEnd: function () {
    if (!this.aiming) return;
    this.aiming = false;
    if (this.marker) this.marker.setAttribute("visible", "false");
    if (!this.hasTarget) return;
    this.hasTarget = false;

    // No teletransportar dentro de un árbol/obstáculo (reusa collision-manager).
    if (
      this.collisionManager &&
      this.collisionManager.checkCollision(this.target)
    ) {
      return;
    }

    // Salto en XZ; la altura la mantiene el rig (boundary-collision/collision-responder
    // siguen corrigiendo después como red de seguridad).
    const pos = this.el.object3D.position;
    pos.x = this.target.x;
    pos.z = this.target.z;
  },

  tick: function () {
    if (!this.aiming || !this.enabled) return;
    if (!this.handEl || !this.handEl.object3D) return;

    this.handEl.object3D.getWorldPosition(this.handPos);
    this.handEl.object3D.getWorldDirection(this.handDir);
    this.handDir.multiplyScalar(-1); // A-Frame mira a -Z; negar (ver CLAUDE.md §10)

    this.ray.origin.copy(this.handPos);
    this.ray.direction.copy(this.handDir).normalize();

    // Intersección con el plano del suelo (y = 0).
    if (!this.ray.intersectPlane(this.groundPlane, this.target)) {
      this.hasTarget = false;
      if (this.marker) this.marker.setAttribute("visible", "false");
      return;
    }

    // Clamp al radio máximo (centro del mapa en 0,0).
    const r = Math.hypot(this.target.x, this.target.z);
    if (r > this.data.maxRange) {
      const s = this.data.maxRange / r;
      this.target.x *= s;
      this.target.z *= s;
    }
    this.target.y = 0;
    this.hasTarget = true;

    // Marcador (hijo de <a-scene>: coords locales == mundo).
    if (this.marker) {
      this.marker.object3D.position.set(this.target.x, 0.02, this.target.z);
      this.marker.setAttribute("visible", "true");
    }
  },

  remove: function () {
    if (this.handEl) {
      this.handEl.removeEventListener("pinchstarted", this.onPinchStart);
      this.handEl.removeEventListener("pinchended", this.onPinchEnd);
    }
  },
});
