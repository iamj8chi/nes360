// flight-locomotion — locomoción del MODO VUELO. Vive en el #cameraRig y está
// DESACTIVADO por defecto: lo activa/desactiva `vuelo-mode` (enable()/disable()).
//
// Esquemas (schema.verticalMode), pensados para experimentar:
//  - "gaze-gravity" (ACTUAL): VR vuela en la dirección 3D de la mirada (incluye pitch:
//    mirar arriba sube, abajo baja); al dejar de aletear desacelera lento y planea
//    descendiendo por gravedad. Reservados para luego: "gaze-nogravity", "flap-lift".
//
// VR ("tipo ave"):
//  - Aletear ambos mandos hacia abajo (velocidad vertical sobre flapVelThreshold) suma
//    empuje hacia adelante (forwardSpeed, cap maxSpeed).
//  - Sin aletear: forwardSpeed decae (drag) → "se detiene lentamente".
//  - Banking por umbral fijo: si un mando está más bajo que el otro por más de
//    bankThreshold, el rig rota (yaw) a bankTurnRate hacia ese lado (on/off).
//
// PC (desktop): el desplazamiento horizontal lo da `movement-controls` (WASD). Aquí solo
//  el eje vertical: gravedad lenta constante; Space suma impulso hacia arriba (pulsar
//  varias veces = subir); Ctrl mantenido cae a fastFallGravity.
//
// Límites: clamp de altura [minAltitude, maxAltitude]. Borde de mapa y colisión de
//  árboles los siguen resolviendo boundary-collision y collision-responder (XZ).
AFRAME.registerComponent("flight-locomotion", {
  schema: {
    enabled: { type: "boolean", default: false },
    verticalMode: { type: "string", default: "gaze-gravity" },

    // Empuje hacia adelante (VR)
    maxSpeed: { type: "number", default: 18 }, // m/s tope de avance
    drag: { type: "number", default: 0.5 }, // 1/s decaimiento de forwardSpeed al no aletear (bajo = planeo largo)
    flapVelThreshold: { type: "number", default: 0.6 }, // m/s descenso de mano para contar como aleteo
    flapImpulse: { type: "number", default: 15 }, // m/s sumados por aleteo

    // Eje vertical
    gravity: { type: "number", default: 1.5 }, // m/s² descenso lento (planeo)
    fastFallGravity: { type: "number", default: 9.8 }, // m/s² caída con Ctrl (PC)
    pcUpImpulse: { type: "number", default: 4 }, // m/s sumados por pulsar Space (PC)

    // Banking (giro fijo por umbral)
    bankThreshold: { type: "number", default: 0.25 }, // m de diferencia de altura entre mandos
    bankTurnRate: { type: "number", default: 1.2 }, // rad/s de giro mientras se supera el umbral

    // Límites de altura (rig.y)
    minAltitude: { type: "number", default: 0 },
    maxAltitude: { type: "number", default: 40 },
  },

  init: function () {
    this.forwardSpeed = 0;
    this.vVel = 0; // velocidad vertical (m/s), usada principalmente en PC

    this.head = null;
    this.leftHand = null;
    this.rightHand = null;

    // Estado de manos para derivar velocidad vertical entre ticks.
    this.prevLeftY = null;
    this.prevRightY = null;
    this.leftWorld = new THREE.Vector3();
    this.rightWorld = new THREE.Vector3();
    this.forwardDir = new THREE.Vector3();
    this.yAxis = new THREE.Vector3(0, 1, 0);

    // Teclado (solo PC). pcUp se consume por pulsación; ctrlHeld es estado mantenido.
    this.pcUpQueued = 0;
    this.ctrlHeld = false;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  },

  enable: function () {
    this.el.setAttribute("flight-locomotion", "enabled", true);
    this.forwardSpeed = 0;
    this.vVel = 0;
    this.prevLeftY = null;
    this.prevRightY = null;
  },

  disable: function () {
    this.el.setAttribute("flight-locomotion", "enabled", false);
    this.forwardSpeed = 0;
    this.vVel = 0;
  },

  onKeyDown: function (e) {
    if (!this.data.enabled) return;
    if (e.code === "Space") {
      this.pcUpQueued += 1; // cada pulsación encola un impulso
      e.preventDefault();
    } else if (e.code === "ControlLeft" || e.code === "ControlRight") {
      this.ctrlHeld = true;
    }
  },

  onKeyUp: function (e) {
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
      this.ctrlHeld = false;
    }
  },

  resolveRefs: function () {
    if (!this.head) this.head = document.getElementById("head");
    if (!this.leftHand) this.leftHand = document.getElementById("leftHand");
    if (!this.rightHand) this.rightHand = document.getElementById("rightHand");
  },

  // Velocidad vertical (m/s, positiva hacia arriba) de una mano desde el tick previo.
  handVerticalVel: function (handEl, worldVec, prevY, dt) {
    if (!handEl || !handEl.object3D) return { vel: 0, y: prevY };
    handEl.object3D.getWorldPosition(worldVec);
    const y = worldVec.y;
    if (prevY === null) return { vel: 0, y: y };
    return { vel: (y - prevY) / dt, y: y };
  },

  tick: function (time, timeDelta) {
    if (!this.data.enabled) return;
    const dt = (timeDelta || 0) / 1000;
    if (dt <= 0) return;

    this.resolveRefs();
    const pos = this.el.object3D.position;
    const isVR = this.el.sceneEl.is("vr-mode");

    if (isVR) {
      this.tickVR(dt, pos);
    } else {
      this.tickPC(dt, pos);
    }

    // Límite de altura (piso/techo). Al tocar piso, anular descenso acumulado.
    if (pos.y <= this.data.minAltitude) {
      pos.y = this.data.minAltitude;
      if (this.vVel < 0) this.vVel = 0;
    } else if (pos.y >= this.data.maxAltitude) {
      pos.y = this.data.maxAltitude;
      if (this.vVel > 0) this.vVel = 0;
    }
  },

  tickVR: function (dt, pos) {
    // --- Aleteo: velocidad vertical de cada mano ---
    const l = this.handVerticalVel(
      this.leftHand,
      this.leftWorld,
      this.prevLeftY,
      dt
    );
    const r = this.handVerticalVel(
      this.rightHand,
      this.rightWorld,
      this.prevRightY,
      dt
    );
    this.prevLeftY = l.y;
    this.prevRightY = r.y;

    // Power stroke: ambas manos bajando más rápido que el umbral.
    const thr = this.data.flapVelThreshold;
    const flapping = l.vel < -thr && r.vel < -thr;
    if (flapping) {
      // Empuje proporcional a la fuerza del aletazo (cuánto bajan las manos) e
      // independiente del frame-rate; se acumula durante el downstroke hasta maxSpeed.
      const stroke = (-l.vel - r.vel) * 0.5; // m/s medio de descenso
      this.forwardSpeed = Math.min(
        this.data.maxSpeed,
        this.forwardSpeed + this.data.flapImpulse * stroke * dt
      );
    } else {
      // Sin aletear: desacelerar lentamente.
      this.forwardSpeed -= this.forwardSpeed * this.data.drag * dt;
      if (this.forwardSpeed < 0.01) this.forwardSpeed = 0;
    }

    // --- Dirección 3D de la mirada (incluye pitch) ---
    if (this.head && this.head.object3D) {
      this.head.object3D.getWorldDirection(this.forwardDir); // mira hacia -Z mundo
      this.forwardDir.multiplyScalar(-1); // getWorldDirection apunta detrás; queremos el frente
    } else {
      this.forwardDir.set(0, 0, -1);
    }

    // Avance según el esquema vertical.
    if (this.data.verticalMode === "gaze-gravity") {
      // Avanza en 3D según la mirada; además gravedad lenta constante (planeo).
      pos.addScaledVector(this.forwardDir, this.forwardSpeed * dt);
      pos.y -= this.data.gravity * dt;
    } else {
      // Esquemas reservados — por ahora se comportan como gaze-gravity.
      pos.addScaledVector(this.forwardDir, this.forwardSpeed * dt);
      pos.y -= this.data.gravity * dt;
    }

    // --- Banking: giro fijo por umbral ---
    const diff = (this.prevLeftY ?? 0) - (this.prevRightY ?? 0);
    if (Math.abs(diff) > this.data.bankThreshold) {
      // Mano izquierda más baja (diff < 0) → girar a la izquierda (yaw +).
      const dir = diff < 0 ? 1 : -1;
      this.el.object3D.rotateOnAxis(
        this.yAxis,
        dir * this.data.bankTurnRate * dt
      );
    }
  },

  tickPC: function (dt, pos) {
    // Horizontal lo maneja movement-controls (WASD). Aquí solo el eje vertical.
    // Impulsos de Space encolados.
    while (this.pcUpQueued > 0) {
      this.vVel += this.data.pcUpImpulse;
      this.pcUpQueued -= 1;
    }

    // Gravedad: lenta por defecto, rápida con Ctrl.
    const g = this.ctrlHeld ? this.data.fastFallGravity : this.data.gravity;
    this.vVel -= g * dt;

    pos.y += this.vVel * dt;
  },

  remove: function () {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  },
});
