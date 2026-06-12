// Global Shadow Control - Toggle all shadow casting and receiving
AFRAME.registerComponent("shadow-control", {
  schema: {
    enabled: { type: "boolean", default: false }, // Set to false to disable all shadows
  },

  init: function () {
    this.sceneEl = this.el.sceneEl || this.el;
    this.shadowsEnabled = this.data.enabled;

    // Wait for scene to be fully loaded
    if (this.sceneEl.hasLoaded) {
      this.applyShadowSettings();
    } else {
      this.sceneEl.addEventListener("loaded", () => {
        this.applyShadowSettings();
      });
    }
  },

  update: function (oldData) {
    if (oldData.enabled !== this.data.enabled) {
      this.shadowsEnabled = this.data.enabled;
      this.applyShadowSettings();
    }
  },

  applyShadowSettings: function () {
    console.log(`Setting shadows to: ${this.shadowsEnabled}`);

    // Configure renderer shadow map
    try {
      const renderer = this.sceneEl.renderer;
      if (renderer) {
        renderer.shadowMap.enabled = this.shadowsEnabled;
        if (this.shadowsEnabled && window.THREE && THREE.PCFSoftShadowMap) {
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
      }
    } catch (e) {
      console.warn("Could not configure renderer shadowMap", e);
    }

    // Configure sun light
    const sunEl = document.getElementById("sun");
    if (sunEl) {
      const light = sunEl.getObject3D("light");
      if (light && light.isDirectionalLight) {
        light.castShadow = this.shadowsEnabled;

        if (this.shadowsEnabled) {
          // Configure shadow camera if enabled
          light.shadow.mapSize.width = 2048;
          light.shadow.mapSize.height = 2048;
          const cam = light.shadow.camera;
          cam.left = -80;
          cam.right = 80;
          cam.top = 80;
          cam.bottom = -80;
          cam.near = 0.5;
          cam.far = 400;
          if (typeof cam.updateProjectionMatrix === "function") {
            cam.updateProjectionMatrix();
          }
          light.shadow.bias = -0.0015;
        }
      }
    }

    // Update all meshes in the scene
    this.sceneEl.object3D.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = this.shadowsEnabled;
        node.receiveShadow = this.shadowsEnabled;
      }
    });

    // Listen for newly loaded models
    if (!this.modelLoadedHandler) {
      this.modelLoadedHandler = (evt) => {
        const el = evt.target;
        if (el && el.object3D) {
          el.object3D.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = this.shadowsEnabled;
              node.receiveShadow = this.shadowsEnabled;
            }
          });
        }
      };
      this.sceneEl.addEventListener("model-loaded", this.modelLoadedHandler);
    }
  },

  remove: function () {
    if (this.modelLoadedHandler) {
      this.sceneEl.removeEventListener("model-loaded", this.modelLoadedHandler);
    }
  },
});
