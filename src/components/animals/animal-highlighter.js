// Yellow hover highlight for animals — mounted ONCE on the scene.
//
// It listens for the cursor events `mouseenter` / `mouseleave`, which every cursor
// emits (the desktop mouse cursor on #head AND the VR controller cursors on the hands)
// and which bubble up to the scene. This is more reliable than the old
// raycaster-intersection / -cleared approach: `mouseleave` always fires when the
// cursor stops pointing at an entity, so the highlight never gets stuck, and a single
// instance covers both desktop and VR.
//
// Found animals keep their permanent green glow (set by animal-clickable) and are not
// overwritten with yellow.
AFRAME.registerComponent("animal-highlighter", {
  init: function () {
    // Per-mesh snapshot of the original emissive so we can restore it on leave.
    this.originalMaterials = new Map();

    this.onEnter = this.onEnter.bind(this);
    this.onLeave = this.onLeave.bind(this);

    // mouseenter/mouseleave bubble from the pointed entity up to the scene.
    this.el.addEventListener("mouseenter", this.onEnter);
    this.el.addEventListener("mouseleave", this.onLeave);
  },

  onEnter: function (evt) {
    const el = evt.target;
    if (el && el.classList && el.classList.contains("animal")) {
      this.highlight(el);
    }
  },

  onLeave: function (evt) {
    const el = evt.target;
    if (el && el.classList && el.classList.contains("animal")) {
      this.unhighlight(el);
    }
  },

  highlight: function (animalEl) {
    // Don't override the green glow of an already-found animal.
    const clickable = animalEl.components["animal-clickable"];
    if (clickable && clickable.found) return;

    const obj = animalEl.getObject3D("mesh");
    if (!obj) return;

    obj.traverse((node) => {
      if (node.isMesh && node.material && node.material.emissive) {
        if (!this.originalMaterials.has(node)) {
          this.originalMaterials.set(node, {
            emissive: node.material.emissive.clone(),
            emissiveIntensity: node.material.emissiveIntensity || 0,
          });
        }
        node.material.emissive.setHex(0xffff00); // Yellow glow
        node.material.emissiveIntensity = 0.5;
        node.material.needsUpdate = true;
      }
    });
  },

  unhighlight: function (animalEl) {
    const obj = animalEl.getObject3D("mesh");
    if (!obj) return;

    // Found animals revert to green, everything else to its stored original.
    const clickable = animalEl.components["animal-clickable"];
    const isFound = clickable && clickable.found;

    obj.traverse((node) => {
      if (node.isMesh && node.material && node.material.emissive) {
        if (isFound) {
          node.material.emissive.setHex(0x00ff00); // Green glow
          node.material.emissiveIntensity = 0.8;
        } else {
          const original = this.originalMaterials.get(node);
          if (original) {
            node.material.emissive.copy(original.emissive);
            node.material.emissiveIntensity = original.emissiveIntensity;
          } else {
            node.material.emissive.setHex(0x000000);
            node.material.emissiveIntensity = 0;
          }
        }
        node.material.needsUpdate = true;
      }
    });
  },

  remove: function () {
    this.el.removeEventListener("mouseenter", this.onEnter);
    this.el.removeEventListener("mouseleave", this.onLeave);
  },
});
