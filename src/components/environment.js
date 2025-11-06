// Environment and Effects Components
AFRAME.registerComponent("wind-effect", {
  schema: {
    strengthX: { type: "number", default: 0.01 },
    strengthY: { type: "number", default: 0.01 },
    strengthZ: { type: "number", default: 0.01 },
    frequency: { type: "number", default: 0.6 },
  },

  init: function () {
    this.startTime = performance.now() / 1000;
    this.targets = [];

    this.el.addEventListener("model-loaded", () => {
      this.setupWindTargets();
    });
  },

  setupWindTargets: function () {
    const obj = this.el.getObject3D("mesh");
    if (!obj) return;

    obj.traverse((node) => {
      if (node.isMesh) {
        this.targets.push({
          node: node,
          basePos: node.position.clone(),
          baseRot: node.rotation.clone(),
        });
      }
    });
  },

  tick: function () {
    if (this.targets.length === 0) return;

    const elapsed = performance.now() / 1000 - this.startTime;

    this.targets.forEach((target, i) => {
      const phase = i * 0.5;

      // Position wiggle
      const px = this.easedSine(
        elapsed,
        this.data.strengthX,
        this.data.frequency,
        phase
      );
      const py = this.easedSine(
        elapsed,
        this.data.strengthY,
        this.data.frequency * 0.8,
        phase + 1
      );
      const pz = this.easedSine(
        elapsed,
        this.data.strengthZ,
        this.data.frequency * 1.2,
        phase - 1
      );

      target.node.position.set(
        target.basePos.x + px,
        target.basePos.y + py,
        target.basePos.z + pz
      );
    });
  },

  easedSine: function (time, amplitude, frequency, phase) {
    return Math.sin(time * frequency + phase) * amplitude;
  },
});

// Composite Tree Component (Simplified)
AFRAME.registerComponent("composite-tree", {
  schema: {
    scale: { type: "number", default: 5.0 },
    windStrength: { type: "number", default: 0.02 },
  },

  init: function () {
    this.createTree();
  },

  createTree: function () {
    // Base tree trunk
    const trunk = document.createElement("a-cylinder");
    trunk.setAttribute("geometry", "radius: 0.1; height: 2");
    trunk.setAttribute("material", "color: #8B4513");
    trunk.setAttribute("position", "0 1 0");

    // Canopy with wind effect
    const canopy = document.createElement("a-sphere");
    canopy.setAttribute("geometry", "radius: 1");
    canopy.setAttribute("material", "color: #228B22");
    canopy.setAttribute("position", "0 2.5 0");
    canopy.setAttribute(
      "wind-effect",
      `strengthX: ${this.data.windStrength}; strengthY: ${
        this.data.windStrength * 0.5
      }; strengthZ: ${this.data.windStrength}`
    );

    this.el.appendChild(trunk);
    this.el.appendChild(canopy);

    // Apply scale
    this.el.setAttribute(
      "scale",
      `${this.data.scale} ${this.data.scale} ${this.data.scale}`
    );
  },
});
