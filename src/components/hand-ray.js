// hand-ray — puntero láser propio para las MANOS (WebXR hand tracking) y, de paso, para
// los mandos. Vive en cada entidad de mano (#leftHand/#rightHand) junto a
// hand-tracking-controls y meta-touch-controls. REEMPLAZA a raycaster+cursor+line de
// A-Frame en esas entidades.
//
// ¿Por qué propio? hand-tracking-controls fija el object3D de la entidad en el ORIGEN del
// rig (no en la mano) y trackea la muñeca/dedos en objetos aparte (wristObject3D,
// indexTipPosition, ambos en MUNDO). Por eso el raycaster nativo —que sale del object3D—
// dispara desde el rig y no desde la mano (no se veía láser ni clickeaba el pinch).
//
// hand-ray arma su PROPIO THREE.Raycaster en espacio-mundo desde esas articulaciones,
// dibuja su propia línea y despacha hover (mouseenter/mouseleave) + click con el MISMO
// contrato de eventos del cursor, así animal-highlighter, orb-controller y animal-clickable
// funcionan sin cambios. También cubre los mandos: cuando hay controlador físico usa el
// object3D de la entidad (que sí posiciona meta-touch-controls) y el gatillo.

// Articulación hacia la que apunta el rayo (dirección = muñeca → esta). Usamos el nudillo
// del dedo medio (índice 11 en el orden XRHand): casi no se mueve al hacer pinch (a
// diferencia de la punta del índice, que salta hacia el pulgar y hacía temblar el láser).
const AIM_JOINT_INDEX = 11; // middle-finger-phalanx-proximal

AFRAME.registerComponent("hand-ray", {
  schema: {
    hand: { type: "string", default: "left" }, // 'left' | 'right' (cosmético/diag)
    color: { type: "color", default: "#00FF00" },
    far: { type: "number", default: 20 },
    objects: { type: "string", default: ".clickable, .animal" },
  },

  init: function () {
    this.htc = null; // hand-tracking-controls
    this.tracked = null; // tracked-controls
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.data.far;

    this.active = false; // hay un rayo válido este frame (lo lee pinch-teleport)
    this.origin = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.aimRef = new THREE.Vector3();
    this.jointMat = new THREE.Matrix4();
    this.fwd = new THREE.Vector3();
    this.rigObj = null; // object3D del #cameraRig (offset de teleport/locomoción)
    this.wristReparented = false;

    this.targets = []; // a-entities objetivo
    this.targetObjects = []; // sus object3D (reusado por frame)
    this.intersectedEl = null; // elemento apuntado ahora (lo lee pinch-teleport)
    this.downEl = null; // elemento donde empezó el pinch/gatillo

    // Línea visual en MUNDO (hija de la escena, no de la mano, para controlar coords).
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3)
    );
    this.lineGeom = geom;
    this.line = new THREE.Line(
      geom,
      new THREE.LineBasicMaterial({ color: new THREE.Color(this.data.color) })
    );
    this.line.visible = false;
    this.line.frustumCulled = false;

    this.onSelectStart = this.onSelectStart.bind(this);
    this.onSelectEnd = this.onSelectEnd.bind(this);

    this.el.addEventListener("pinchstarted", this.onSelectStart);
    this.el.addEventListener("pinchended", this.onSelectEnd);
    this.el.addEventListener("triggerdown", this.onSelectStart);
    this.el.addEventListener("triggerup", this.onSelectEnd);

    const self = this;
    const attach = () => {
      self.el.sceneEl.object3D.add(self.line);
      self.refreshTargets();
    };
    if (this.el.sceneEl.hasLoaded) attach();
    else this.el.sceneEl.addEventListener("loaded", attach);

    // Re-escanear objetivos cada 2 s (los animales aparecen/ocultan por modo).
    this.refreshInterval = setInterval(() => self.refreshTargets(), 2000);
  },

  refreshTargets: function () {
    this.targets = Array.prototype.slice.call(
      document.querySelectorAll(this.data.objects)
    );
  },

  handsActive: function () {
    if (!this.htc) this.htc = this.el.components["hand-tracking-controls"];
    return !!(this.htc && this.htc.hasPoses);
  },

  controllerActive: function () {
    if (!this.tracked) this.tracked = this.el.components["tracked-controls"];
    const c = this.tracked && this.tracked.controller;
    return !!(c && !c.hand); // mando físico (no mano)
  },

  resolveRig: function () {
    if (this.rigObj) return;
    const rig = document.getElementById("cameraRig");
    this.rigObj = rig ? rig.object3D : this.el.object3D.parent;
  },

  // Cuelga el wristObject3D del rig (una vez) para que la ficha VR anclada a la mano
  // acompañe el teleport. Su transform local (pose de muñeca en espacio físico) no cambia;
  // solo se le suma el offset del rig al calcular el mundo.
  reparentWrist: function () {
    if (this.wristReparented || !this.rigObj || !this.htc) return;
    const wrist = this.htc.wristObject3D;
    if (wrist && wrist.parent !== this.rigObj) {
      this.rigObj.add(wrist);
      this.wristReparented = true;
    }
  },

  // Define this.origin/this.dir en MUNDO. Devuelve false si no hay fuente válida.
  computeRay: function () {
    if (this.handsActive()) {
      // hand-tracking-controls reporta muñeca/dedos en espacio de referencia (físico),
      // colgados del root de la escena: NO llevan el offset del rig (teleport/locomoción).
      // Hay que transformarlos por la matriz mundial del #cameraRig para obtener MUNDO.
      this.resolveRig();
      // Además, reparentamos el wristObject3D al rig (una vez): de él cuelga la ficha VR
      // (#animalInfoCardVR) y, en el root de la escena, se quedaba en la posición física
      // original al teletransportar. Bajo el rig sí acompaña el offset.
      this.reparentWrist();

      this.origin.copy(this.htc.wristObject3D.position);
      // Apuntar desde la muñeca hacia el nudillo del dedo medio (estable durante el pinch).
      this.jointMat.fromArray(this.htc.jointPoses, AIM_JOINT_INDEX * 16);
      this.aimRef.setFromMatrixPosition(this.jointMat);
      if (this.rigObj) {
        this.origin.applyMatrix4(this.rigObj.matrixWorld);
        this.aimRef.applyMatrix4(this.rigObj.matrixWorld);
      }
      this.dir.copy(this.aimRef).sub(this.origin);
      if (this.dir.lengthSq() < 1e-8) return false;
      this.dir.normalize();
      return true;
    }
    if (this.controllerActive()) {
      this.el.object3D.getWorldPosition(this.origin);
      this.el.object3D.getWorldDirection(this.fwd);
      this.dir.copy(this.fwd).multiplyScalar(-1).normalize(); // A-Frame mira a -Z
      return true;
    }
    return false;
  },

  worldVisible: function (o) {
    while (o) {
      if (o.visible === false) return false;
      o = o.parent;
    }
    return true;
  },

  collectObjects: function () {
    this.targetObjects.length = 0;
    for (let i = 0; i < this.targets.length; i++) {
      const o = this.targets[i].object3D;
      if (o && this.worldVisible(o)) this.targetObjects.push(o);
    }
    return this.targetObjects;
  },

  tick: function () {
    this.active = this.computeRay();
    if (!this.active) {
      this.line.visible = false;
      this.setIntersected(null);
      return;
    }

    this.raycaster.set(this.origin, this.dir);
    this.raycaster.far = this.data.far;

    const hits = this.raycaster.intersectObjects(this.collectObjects(), true);
    let hitEl = null;
    let endDist = this.data.far;
    if (hits.length) {
      endDist = hits[0].distance;
      let o = hits[0].object;
      while (o && !o.el) o = o.parent; // subir al a-entity dueño
      hitEl = o && o.el ? o.el : null;
    }

    // Actualizar la línea (origen → punto final).
    const p = this.lineGeom.attributes.position.array;
    p[0] = this.origin.x;
    p[1] = this.origin.y;
    p[2] = this.origin.z;
    this.tmp.copy(this.origin).addScaledVector(this.dir, endDist);
    p[3] = this.tmp.x;
    p[4] = this.tmp.y;
    p[5] = this.tmp.z;
    this.lineGeom.attributes.position.needsUpdate = true;
    this.line.visible = true;

    this.setIntersected(hitEl);
  },

  // Hover con el mismo contrato del cursor (mouseenter/mouseleave burbujean al scene).
  setIntersected: function (el) {
    if (this.intersectedEl === el) return;
    if (this.intersectedEl) {
      this.intersectedEl.emit("mouseleave", { cursorEl: this.el });
    }
    this.intersectedEl = el;
    if (el) el.emit("mouseenter", { cursorEl: this.el });
  },

  onSelectStart: function () {
    this.downEl = this.intersectedEl;
    if (this.downEl) this.downEl.emit("mousedown", { cursorEl: this.el });
  },

  onSelectEnd: function () {
    const el = this.intersectedEl;
    if (el) el.emit("mouseup", { cursorEl: this.el });
    if (el && el === this.downEl) el.emit("click", { cursorEl: this.el });
    this.downEl = null;
  },

  remove: function () {
    this.el.removeEventListener("pinchstarted", this.onSelectStart);
    this.el.removeEventListener("pinchended", this.onSelectEnd);
    this.el.removeEventListener("triggerdown", this.onSelectStart);
    this.el.removeEventListener("triggerup", this.onSelectEnd);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.line && this.line.parent) this.line.parent.remove(this.line);
  },
});
