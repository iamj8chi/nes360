// Performance Optimization Components
AFRAME.registerComponent("performance-optimizer", {
  schema: {
    updateInterval: { type: "number", default: 200 },
    nearDistance: { type: "number", default: 15 },
    midDistance: { type: "number", default: 30 },
    farDistance: { type: "number", default: 50 },
  },

  init: function () {
    this.camera = null;
    this.lastUpdate = 0;

    // Use config values
    const config = window.NES360_CONFIG.performance;
    this.data.nearDistance = config.nearDistance;
    this.data.midDistance = config.midDistance;
    this.data.farDistance = config.farDistance;
    this.data.updateInterval = config.updateInterval;

    // Throttle tick function
    this.tick = AFRAME.utils.throttleTick(
      this.tick,
      this.data.updateInterval,
      this
    );
  },

  tick: function () {
    if (!this.camera) {
      const cameraEl = document.querySelector("[camera]");
      if (cameraEl) {
        this.camera = cameraEl.getObject3D("camera");
      }
      return;
    }

    const cameraPos = this.camera.getWorldPosition(new THREE.Vector3());
    const entityPos = this.el.object3D.getWorldPosition(new THREE.Vector3());
    const distance = cameraPos.distanceTo(entityPos);

    this.optimizeByDistance(distance);
  },

  optimizeByDistance: function (distance) {
    // Visibility culling
    if (distance > this.data.farDistance) {
      this.el.setAttribute("visible", false);
      return;
    } else {
      this.el.setAttribute("visible", true);
    }

    // Animation speed scaling
    const animMixer = this.el.components["animation-mixer"];
    if (animMixer && animMixer.mixer) {
      if (distance > this.data.midDistance) {
        animMixer.mixer.timeScale = 0.5; // Far: slow animations
      } else if (distance > this.data.nearDistance) {
        animMixer.mixer.timeScale = 0.8; // Mid: normal speed
      } else {
        animMixer.mixer.timeScale = 1.0; // Near: full speed
      }
    }

    // LOD for materials (simplified)
    const obj = this.el.getObject3D("mesh");
    if (obj) {
      obj.traverse((node) => {
        if (node.isMesh && node.material) {
          if (distance > this.data.midDistance) {
            // Far objects: reduce quality
            node.material.precision = "lowp";
          } else {
            // Near objects: full quality
            node.material.precision = "mediump";
          }
        }
      });
    }
  },
});

// Material Optimizer
AFRAME.registerComponent("material-optimizer", {
  init: function () {
    this.el.addEventListener("model-loaded", () => {
      this.optimizeMaterials();
    });
  },

  optimizeMaterials: function () {
    const obj = this.el.getObject3D("mesh");
    if (!obj) return;

    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        const material = node.material;

        // Optimize for VR
        material.precision = "mediump";

        // Reduce texture anisotropy
        if (material.map) {
          material.map.anisotropy = 4; // Reduced from default 16
        }

        // Force update
        material.needsUpdate = true;
      }
    });
  },
});

// Staggered Animation Start
AFRAME.registerComponent("staggered-start", {
  schema: {
    maxOffset: { type: "number", default: 1.5 },
  },

  init: function () {
    this.el.addEventListener("model-loaded", () => {
      this.staggerAnimation();
    });
  },

  staggerAnimation: function () {
    const offset = -Math.random() * Math.abs(this.data.maxOffset);

    const animMixer = this.el.components["animation-mixer"];
    if (animMixer && animMixer.mixer) {
      animMixer.mixer.time = Math.abs(offset);
    }
  },
});
