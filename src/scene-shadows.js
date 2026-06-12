// --- Stage 1 lighting: enable renderer shadows and configure sun shadow camera ---
(function () {
  var sceneEl = document.querySelector("a-scene");
  if (!sceneEl) return;

  sceneEl.addEventListener("loaded", function () {
    // enable shadow map on the renderer
    try {
      var renderer = sceneEl.renderer;
      if (renderer) {
        renderer.shadowMap.enabled = true;
        if (window.THREE && THREE.PCFSoftShadowMap)
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    } catch (e) {
      console.warn("Could not enable renderer shadowMap", e);
    }

    // Configure directional sun shadows when its light is available
    var sunEl = document.getElementById("sun");
    if (sunEl) {
      var configureSun = function () {
        var light = sunEl.getObject3D("light");
        if (!light || !light.isDirectionalLight) return;

        light.castShadow = true;
        // shadow map resolution - lower on slow devices if needed
        light.shadow.mapSize.width = 2048; // Reduced from 8192 for VR performance
        light.shadow.mapSize.height = 2048; // Reduced from 8192 for VR performance
        var cam = light.shadow.camera;
        // Expand the shadow camera frustum to cover the visible ground area.
        // Ground is radius 50; give some padding.
        cam.left = -80;
        cam.right = 80;
        cam.top = 80;
        cam.bottom = -80;
        cam.near = 0.5;
        cam.far = 400;
        // Important: update projection matrix after changing camera params
        if (typeof cam.updateProjectionMatrix === "function")
          cam.updateProjectionMatrix();
        light.shadow.bias = -0.0015;
      };
      // Attempt immediate configure and a short delayed retry to catch timing cases
      try {
        configureSun();
      } catch (e) {}
      setTimeout(configureSun, 60);
    }

    // Helper to mark an element's meshes as casting/receiving shadows
    function markShadows(el) {
      try {
        if (!el || !el.object3D) return;
        el.object3D.traverse(function (node) {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
      } catch (e) {
        /* ignore */
      }
    }

    // Mark already-loaded glTF models (in case model-loaded fired before we attached handlers)
    var preloaded = document.querySelectorAll("[gltf-model]");
    preloaded.forEach(function (el) {
      if (el.getObject3D && el.getObject3D("mesh")) {
        markShadows(el);
      }
    });

    // Global handler: when any model is loaded later, set its meshes to cast/receive shadows
    sceneEl.addEventListener("model-loaded", function (ev) {
      markShadows(ev.target);
    });
  });
})();
