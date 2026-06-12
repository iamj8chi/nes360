// Performance optimization: distance-based LOD and culling
AFRAME.registerComponent("performance-optimizer", {
  schema: {
    updateInterval: { type: "number", default: 200 }, // ms
    nearDistance: { type: "number", default: 15 },
    midDistance: { type: "number", default: 30 },
    farDistance: { type: "number", default: 50 },
  },
  init: function () {
    this.camera = null;
    this.lastUpdate = 0;
    this.tick = AFRAME.utils.throttleTick(
      this.tick,
      this.data.updateInterval,
      this
    );
  },
  tick: function (time, timeDelta) {
    if (!this.camera) {
      const cameraEl = document.querySelector("[camera]");
      if (cameraEl) this.camera = cameraEl.object3D;
      return;
    }

    const distance = this.el.object3D.position.distanceTo(this.camera.position);
    const obj = this.el.object3D;

    // Frustum culling - hide objects too far away
    if (distance > this.data.farDistance) {
      obj.visible = false;
      return;
    } else {
      obj.visible = true;
    }

    // Distance-based animation optimization
    const animMixer = this.el.components["animation-mixer"];
    if (animMixer && animMixer.mixer) {
      if (distance > this.data.midDistance) {
        // Far objects: slow down or pause animations
        animMixer.mixer.timeScale = 0.5;
      } else if (distance > this.data.nearDistance) {
        // Mid-range objects: normal speed
        animMixer.mixer.timeScale = 0.8;
      } else {
        // Near objects: full speed
        animMixer.mixer.timeScale = 1.0;
      }
    }
  },
});
