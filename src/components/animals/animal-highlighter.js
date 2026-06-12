AFRAME.registerComponent("animal-highlighter", {
  init: function () {
    this.originalMaterials = new Map();
    this.highlighted = null;
    this.currentIntersected = null;

    // Listen for raycaster intersection events
    this.el.addEventListener("raycaster-intersection", (evt) => {
      const intersectedEls = evt.detail.els;
      let animalFound = false;

      for (let el of intersectedEls) {
        if (el && el.classList.contains("animal")) {
          this.currentIntersected = el;
          this.highlightAnimal(el);
          animalFound = true;
          break;
        }
      }

      // If no animal intersected but we had one highlighted, clear it
      if (!animalFound && this.highlighted) {
        this.unhighlightAnimal(this.highlighted);
        this.highlighted = null;
        this.currentIntersected = null;
      }
    });

    this.el.addEventListener("raycaster-intersection-cleared", (evt) => {
      if (this.highlighted) {
        this.unhighlightAnimal(this.highlighted);
        this.highlighted = null;
        this.currentIntersected = null;
      }
    });
  },

  highlightAnimal: function (animalEl) {
    if (this.highlighted === animalEl) return;

    // Check if animal is already found - don't highlight with yellow if it is
    const clickable = animalEl.components["animal-clickable"];
    if (clickable && clickable.found) {
      return; // Don't apply yellow highlight to found animals
    }

    // Unhighlight previous
    if (this.highlighted && this.highlighted !== animalEl) {
      this.unhighlightAnimal(this.highlighted);
    }

    this.highlighted = animalEl;
    const obj = animalEl.getObject3D("mesh");
    if (!obj) return;

    // Store original materials and apply highlight
    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        if (!this.originalMaterials.has(node)) {
          this.originalMaterials.set(node, {
            emissive: node.material.emissive
              ? node.material.emissive.clone()
              : null,
            emissiveIntensity: node.material.emissiveIntensity || 0,
          });
        }

        // Add highlight glow
        if (node.material.emissive) {
          node.material.emissive.setHex(0xffff00); // Yellow glow
          node.material.emissiveIntensity = 0.5;
          node.material.needsUpdate = true;
        }
      }
    });
  },

  unhighlightAnimal: function (animalEl) {
    if (!animalEl) {
      this.highlighted = null;
      return;
    }

    const obj = animalEl.getObject3D("mesh");
    if (!obj) {
      this.highlighted = null;
      return;
    }

    // Check if animal is found - if so, restore green, not original
    const clickable = animalEl.components["animal-clickable"];
    const isFound = clickable && clickable.found;

    // Restore materials
    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        if (isFound) {
          // Keep green glow for found animals
          if (node.material.emissive) {
            node.material.emissive.setHex(0x00ff00); // Green glow
            node.material.emissiveIntensity = 0.8;
          }
        } else {
          // Restore original materials for unfound animals
          const original = this.originalMaterials.get(node);
          if (original) {
            if (original.emissive && node.material.emissive) {
              node.material.emissive.copy(original.emissive);
            } else if (node.material.emissive) {
              node.material.emissive.setHex(0x000000);
            }
            node.material.emissiveIntensity = original.emissiveIntensity;
          } else {
            // Fallback: reset to black
            if (node.material.emissive) {
              node.material.emissive.setHex(0x000000);
              node.material.emissiveIntensity = 0;
            }
          }
        }
        node.material.needsUpdate = true;
      }
    });

    this.highlighted = null;
  },
});
