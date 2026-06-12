// Canopy wind component: applies eased per-node position/rotation wiggle to a loaded glTF model
AFRAME.registerComponent("canopy-wind", {
  schema: {
    strengthX: { type: "number", default: 0.01 },
    strengthY: { type: "number", default: 0.01 },
    strengthZ: { type: "number", default: 0.01 },
    freqA: { type: "number", default: 0.6 },
    freqB: { type: "number", default: 1.25 },
    rotStrength: { type: "number", default: 0.01 },
    nodesSelector: { type: "string", default: "" },
  },

  init: function () {
    this.start = performance.now() / 1000;
    this.targets = [];
    this.onModelLoaded = this.onModelLoaded.bind(this);

    if (this.el.getObject3D("mesh")) {
      this.onModelLoaded();
    } else {
      this.el.addEventListener("model-loaded", this.onModelLoaded);
    }
  },

  remove: function () {
    this.el.removeEventListener("model-loaded", this.onModelLoaded);
  },

  onModelLoaded: function () {
    const root = this.el.getObject3D("mesh") || this.el.object3D;
    if (!root) return;

    root.traverse((node) => {
      // pick meshes and groups; optionally filter by name
      const isMeshOrObject = node.isMesh || node.isObject3D;
      if (!isMeshOrObject) return;
      const nameMatch =
        this.data.nodesSelector === "" ||
        (node.name && node.name.indexOf(this.data.nodesSelector) !== -1);
      if (!nameMatch) return;

      const basePos = node.position.clone();
      const baseRot = node.rotation.clone();
      const phase = Math.random() * Math.PI * 2;
      this.targets.push({ node, basePos, baseRot, phase });
    });
  },

  easedSine: function (t, amp, freq, phase) {
    return (
      amp *
      (Math.sin(t * freq * 2 * Math.PI + phase) * 0.7 +
        Math.sin(t * freq * 2 * Math.PI * 1.37 + phase * 1.9) * 0.3)
    );
  },

  // Helper: robust deg->rad across THREE versions
  degToRad: function (deg) {
    if (
      window.THREE &&
      THREE.MathUtils &&
      typeof THREE.MathUtils.degToRad === "function"
    ) {
      return THREE.MathUtils.degToRad(deg);
    }
    return (deg * Math.PI) / 180;
  },

  tick: function () {
    if (this.targets.length === 0) return;
    const t = performance.now() / 1000 - this.start;
    const { strengthX, strengthY, strengthZ, freqA, freqB, rotStrength } =
      this.data;

    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      const node = target.node;
      const phase = target.phase + i * 0.07;

      const dx =
        this.easedSine(t, strengthX, freqA, phase) +
        this.easedSine(t, strengthX * 0.4, freqB, phase * 1.3);
      const dy =
        this.easedSine(t, strengthY, freqA * 1.1, phase + 0.2) +
        this.easedSine(t, strengthY * 0.4, freqB * 0.9, phase * 0.8);
      const dz =
        this.easedSine(t, strengthZ, freqA * 0.9, phase - 0.15) +
        this.easedSine(t, strengthZ * 0.35, freqB * 1.4, phase * 1.1);

      node.position.set(
        target.basePos.x + dx,
        target.basePos.y + dy,
        target.basePos.z + dz
      );

      const rx = this.easedSine(
        t,
        this.degToRad(rotStrength * 0.6),
        freqA * 1.3,
        phase + i
      );
      const ry = this.easedSine(
        t,
        this.degToRad(rotStrength * 0.25),
        freqA * 0.8,
        phase - i * 0.7
      );
      const rz = this.easedSine(
        t,
        this.degToRad(rotStrength * 0.9),
        freqB * 1.1,
        phase + i * 0.5
      );

      node.rotation.set(
        target.baseRot.x + rx,
        target.baseRot.y + ry,
        target.baseRot.z + rz
      );
    }
  },
});
