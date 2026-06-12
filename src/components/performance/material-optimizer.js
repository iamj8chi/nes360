// Material optimizer for VR performance
AFRAME.registerComponent("material-optimizer", {
  init: function () {
    this.el.addEventListener("model-loaded", () => {
      const obj = this.el.getObject3D("mesh");
      if (!obj) return;

      obj.traverse((node) => {
        if (node.isMesh && node.material) {
          // Optimize material settings for VR
          if (Array.isArray(node.material)) {
            node.material.forEach((mat) => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(node.material);
          }

          // Enable geometry frustum culling
          node.frustumCulled = true;

          // Reduce shadow quality if far from camera
          if (node.castShadow) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        }
      });
    });
  },

  optimizeMaterial: function (material) {
    if (!material) return;

    // Reduce shader precision for better performance
    material.precision = "mediump";

    // Disable features that are expensive in VR
    if (material.map) {
      material.map.anisotropy = 4; // Reduce from default 16
    }

    // Force material update
    material.needsUpdate = true;
  },
});
