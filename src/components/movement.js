// vr-locomotion — desplazamiento por thumbstick en VR. Vive en el #cameraRig.
//
// Los DOS mandos mueven (controllerHand: both): no hay giro por stick, se gira
// girando la cabeza. El giro por stick derecho lo hacía gamepad-controls (dentro de
// movement-controls, de aframe-extras), que además movía con el izquierdo; por eso
// index.html monta movement-controls SIN el control `gamepad` — si no, el stick
// izquierdo movería dos veces y el derecho seguiría rotando.
//
// Input: se escucha `thumbstickmoved` (detail {x, y}), que es lo que emite
// meta-touch-controls. Ojo con `axismove`: en xr-standard el thumbstick son los ejes
// 2 y 3 (0 y 1 son el touchpad, siempre 0), y la detección de mano NO puede leer el
// atributo `hand-controls` — estas entidades usan meta-touch-controls. Las dos cosas
// juntas hacían que este componente no moviera nada.
AFRAME.registerComponent("vr-locomotion", {
  schema: {
    speed: { type: "number", default: 5.0 }, // m/s velocidad de movimiento VR
    acceleration: { type: "number", default: 6.0 }, // lerp factor per second
    deceleration: { type: "number", default: 8.0 }, // lerp factor per second
    deadZone: { type: "number", default: 0.18 }, // thumbstick deadzone
    controllerHand: { type: "string", default: "both" }, // 'left'|'right'|'both'
    useHeadDirection: { type: "boolean", default: true },
  },

  init: function () {
    this.velocity = new THREE.Vector3();
    this.moveVec = new THREE.Vector3();
    // Un vector por mano: si los dos sticks están en uso gana el más empujado, en vez
    // de que el último evento pise al otro.
    this.stick = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
    // Flag de runtime (siempre true): reservado por si hace falta silenciar el
    // thumbstick. Hoy convive con flight-locomotion (aleteo) sin competir: distinto input.
    this.enabled = true;
    this.onAxisMove = this.onAxisMove.bind(this);
    this.onThumbstick = this.onThumbstick.bind(this);
    this.bindControllerListeners();
  },

  bindControllerListeners: function () {
    // Los eventos de los mandos burbujean hasta el rig, así que alcanza con
    // escuchar acá para cubrir las dos manos.
    this.el.addEventListener("thumbstickmoved", this.onThumbstick);
    this.el.addEventListener("axismove", this.onAxisMove);
  },

  // Mano que originó el evento. No se puede usar `hand-controls`: estas entidades
  // llevan meta-touch-controls / hand-tracking-controls. Se prueban los perfiles
  // conocidos y, como último recurso, el id de la entidad (#leftHand/#rightHand).
  handOf: function (el) {
    if (!el || !el.getAttribute) return null;
    const attrs = [
      "meta-touch-controls",
      "oculus-touch-controls",
      "hand-controls",
      "hand-tracking-controls",
    ];
    for (let i = 0; i < attrs.length; i++) {
      const v = el.getAttribute(attrs[i]);
      const hand = v && (typeof v === "string" ? v : v.hand);
      if (typeof hand === "string") {
        if (hand.indexOf("left") !== -1) return "left";
        if (hand.indexOf("right") !== -1) return "right";
      }
    }
    const id = el.id || "";
    if (id.indexOf("left") !== -1) return "left";
    if (id.indexOf("right") !== -1) return "right";
    return null;
  },

  accepts: function (hand) {
    const want = this.data.controllerHand;
    if (want === "both") return true;
    return hand === want;
  },

  setStick: function (hand, x, y) {
    if (!hand || !this.accepts(hand)) return;
    const dz = this.data.deadZone;
    this.stick[hand].x = Math.abs(x) < dz ? 0 : x;
    this.stick[hand].y = Math.abs(y) < dz ? 0 : y;
  },

  onThumbstick: function (evt) {
    const d = evt.detail;
    if (!d) return;
    this.setStick(this.handOf(evt.target), d.x || 0, d.y || 0);
  },

  // Respaldo para perfiles que no emiten thumbstickmoved. En xr-standard el
  // thumbstick son los ejes 2 y 3; los perfiles viejos de 2 ejes usan 0 y 1.
  onAxisMove: function (evt) {
    const axes = evt.detail && evt.detail.axis;
    if (!axes || axes.length < 2) return;
    const i = axes.length >= 4 ? 2 : 0;
    this.setStick(this.handOf(evt.target), axes[i], axes[i + 1]);
  },

  tick: function (time, dt) {
    if (!this.enabled) {
      this.moveVec.set(0, 0, 0);
      this.velocity.set(0, 0, 0);
      return;
    }
    const delta = (dt || 0) / 1000;
    if (delta <= 0) return;

    // De los dos sticks manda el más empujado (con uno solo en uso, ese).
    const l = this.stick.left;
    const r = this.stick.right;
    const useRight = r.x * r.x + r.y * r.y > l.x * l.x + l.y * l.y;
    const s = useRight ? r : l;
    this.moveVec.set(s.x, 0, s.y);

    // Desired local movement
    if (this.moveVec.lengthSq() > 0.000001) {
      const stickMag = Math.min(1, this.moveVec.length());
      const desiredLocal = this.moveVec
        .clone()
        .normalize()
        .multiplyScalar(this.data.speed * stickMag);

      if (this.data.useHeadDirection) {
        const head = this.el.querySelector("#head");
        if (head && head.object3D) {
          const yaw = head.object3D.rotation.y; // radians
          desiredLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        }
      }

      // Smooth acceleration
      this.velocity.lerp(
        desiredLocal,
        Math.min(1, this.data.acceleration * delta)
      );
    } else {
      // Smooth deceleration to zero
      this.velocity.lerp(
        new THREE.Vector3(0, 0, 0),
        Math.min(1, this.data.deceleration * delta)
      );
    }

    // Apply velocity scaled by dt
    const step = this.velocity.clone().multiplyScalar(delta);
    const pos = this.el.object3D.position;
    pos.add(step);
  },

  remove: function () {
    this.el.removeEventListener("thumbstickmoved", this.onThumbstick);
    this.el.removeEventListener("axismove", this.onAxisMove);
  },
});
