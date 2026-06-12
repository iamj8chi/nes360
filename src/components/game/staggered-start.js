// Staggered start: random negative delay to desynchronize animations
AFRAME.registerComponent("staggered-start", {
  schema: {
    maxOffset: { type: "number", default: 1.5 }, // seconds (positive value, component will apply a negative offset up to this)
  },
  init: function () {
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
    // Compute a negative offset (start the animation as if it had started earlier)
    var offset = -Math.random() * Math.abs(this.data.maxOffset);

    // Try to use the existing animation-mixer component if present
    var am = this.el.components && this.el.components["animation-mixer"];
    if (am && am.mixer) {
      // actions may be stored on the component or mixer
      var actions =
        am.actions || am._actions || (am.mixer && am.mixer._actions) || [];
      for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        try {
          // ensure action is playing, then shift its time
          if (typeof action.play === "function") action.play();
          // clamp time to [0, duration]
          if (typeof action.getClip === "function") {
            var dur = action.getClip().duration || 0;
            action.time = Math.max(
              0,
              (action.time || 0) + offset + Math.random() * dur
            );
          } else if (action._clip && action._clip.duration) {
            var d2 = action._clip.duration;
            action.time = Math.max(
              0,
              (action.time || 0) + offset + Math.random() * d2
            );
          } else {
            action.time = Math.max(0, (action.time || 0) + offset);
          }
        } catch (e) {
          // ignore failures on unfamiliar action objects
        }
      }
      // apply one update so the mixer internal time reflects changes
      try {
        am.mixer.update(0);
      } catch (e) {}
      return;
    }

    // Fallback: if the model has animations attached directly, create a temporary mixer and advance
    var root = this.el.getObject3D("mesh") || this.el.object3D;
    if (root && root.animations && root.animations.length) {
      try {
        var mixer = new THREE.AnimationMixer(root);
        for (var j = 0; j < root.animations.length; j++) {
          var clip = root.animations[j];
          var act = mixer.clipAction(clip);
          act.play();
          act.time = Math.max(0, offset + Math.random() * clip.duration);
        }
        mixer.update(0);
      } catch (e) {
        // ignore
      }
    }
  },
});
