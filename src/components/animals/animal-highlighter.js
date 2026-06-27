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
    // Snapshot of the original emissive keyed by MATERIAL (not mesh): a single
    // glTF material is shared across several meshes of an animal, so keying by
    // mesh meant the second mesh snapshotted the already-yellowed material as its
    // "original" and the highlight got stuck on leave. Keying by material snapshots
    // each once, before any mutation.
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
        const mat = node.material;
        if (!this.originalMaterials.has(mat)) {
          this.originalMaterials.set(mat, {
            emissive: mat.emissive.clone(),
            emissiveIntensity: mat.emissiveIntensity || 0,
          });
        }
        mat.emissive.setHex(0xffff00); // Yellow glow
        mat.emissiveIntensity = 0.5;
        mat.needsUpdate = true;
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
        const mat = node.material;
        if (isFound) {
          mat.emissive.setHex(0x00ff00); // Green glow
          mat.emissiveIntensity = 0.8;
        } else {
          const original = this.originalMaterials.get(mat);
          if (original) {
            mat.emissive.copy(original.emissive);
            mat.emissiveIntensity = original.emissiveIntensity;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
        mat.needsUpdate = true;
      }
    });
  },

  remove: function () {
    this.el.removeEventListener("mouseenter", this.onEnter);
    this.el.removeEventListener("mouseleave", this.onLeave);
  },
});
