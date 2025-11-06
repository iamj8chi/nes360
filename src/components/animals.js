// Animal Interaction Components
AFRAME.registerComponent("animal-controller", {
  init: function () {
    this.found = false;
    this.animalType = this.el.getAttribute("data-animal-type");

    this.setupInteractions();
    this.setupEventListeners();
  },

  setupInteractions: function () {
    // Add clickable behavior
    this.el.addEventListener("click", () => {
      if (!this.found) {
        this.onClicked();
      }
    });
  },

  setupEventListeners: function () {
    this.el.sceneEl.addEventListener("safari-game-reset", () => {
      this.reset();
    });

    this.el.sceneEl.addEventListener("safari-animal-found", (evt) => {
      if (evt.detail.animalType === this.animalType) {
        this.markAsFound();
      }
    });
  },

  onClicked: function () {
    console.log(`🦎 Clicked on ${this.animalType}`);

    this.el.sceneEl.emit("safari-animal-clicked", {
      animalType: this.animalType,
      element: this.el,
    });
  },

  markAsFound: function () {
    this.found = true;

    // Visual feedback
    const obj = this.el.getObject3D("mesh");
    if (!obj) return;

    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        if (node.material.emissive) {
          node.material.emissive.setHex(0x00ff00); // Green glow
          node.material.emissiveIntensity = 0.8;
          node.material.needsUpdate = true;
        }
      }
    });

    console.log(`✅ ${this.animalType} marked as found!`);
  },

  reset: function () {
    this.found = false;
    const obj = this.el.getObject3D("mesh");
    if (!obj) return;

    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        if (node.material.emissive) {
          node.material.emissive.setHex(0x000000);
          node.material.emissiveIntensity = 0;
          node.material.needsUpdate = true;
        }
      }
    });
  },
});

// Animal Behavior Component
AFRAME.registerComponent("animal-behavior", {
  schema: {
    speed: { type: "number", default: -0.2 },
    radius: { type: "number", default: 2 },
    yawOffset: { type: "number", default: 0 },
    modelRotation: { type: "number", default: -90 },
    pathRotation: { type: "number", default: 0 },
  },

  init: function () {
    this.startTime = performance.now() / 1000;
    this.pathRotationRad = (this.data.pathRotation * Math.PI) / 180;
    this.modelRotationRad = (this.data.modelRotation * Math.PI) / 180;

    this.generatePhaseOffsets();
  },

  generatePhaseOffsets: function () {
    this.phaseOffsets = {
      pos: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      },
      rot: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      },
    };
  },

  tick: function () {
    const elapsed = performance.now() / 1000 - this.startTime;
    const speed = this.data.speed;

    // Circular path movement
    const ang = elapsed * speed + this.pathRotationRad;

    const baseX = Math.cos(ang) * this.data.radius;
    const baseZ = Math.sin(ang) * this.data.radius;
    const baseY = 0;

    // Add some organic wiggle
    const wiggleX = this.easedSine(elapsed, 0.3, 2.1, this.phaseOffsets.pos.x);
    const wiggleY = this.easedSine(elapsed, 0.2, 1.8, this.phaseOffsets.pos.y);
    const wiggleZ = this.easedSine(elapsed, 0.25, 2.3, this.phaseOffsets.pos.z);

    // Apply position
    this.el.setAttribute("position", {
      x: baseX + wiggleX,
      y: baseY + wiggleY,
      z: baseZ + wiggleZ,
    });

    // Calculate rotation
    const baseYaw =
      (ang * 180) / Math.PI + this.data.yawOffset + this.data.modelRotation;
    const rotWiggleY = this.easedSine(elapsed, 5, 1.7, this.phaseOffsets.rot.y);

    this.el.setAttribute("rotation", `0 ${baseYaw + rotWiggleY} 0`);
  },

  easedSine: function (time, amplitude, frequency, phase) {
    const raw = Math.sin(time * frequency + phase);
    const eased = raw * raw * raw; // Cubic easing
    return eased * amplitude;
  },
});
