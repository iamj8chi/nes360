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

// Animal Highlighter - Visual feedback when pointing at animals
AFRAME.registerComponent("animal-highlighter", {
  init: function () {
    this.originalMaterials = new Map();
    this.highlighted = null;
    this.currentIntersected = null;

    // Listen for raycaster intersection events
    this.el.addEventListener("raycaster-intersection", (evt) => {
      const intersectedEls = evt.detail.els;
      let targetFound = false;

      for (let el of intersectedEls) {
        if (
          el &&
          (el.classList.contains("animal") ||
            el.classList.contains("billboard"))
        ) {
          this.currentIntersected = el;

          if (el.classList.contains("animal")) {
            this.highlightAnimal(el);
          } else if (el.classList.contains("billboard")) {
            this.highlightBillboard(el);
          }

          targetFound = true;
          break;
        }
      }

      // If no target intersected but we had one highlighted, clear it
      if (!targetFound && this.highlighted) {
        this.unhighlightTarget(this.highlighted);
        this.highlighted = null;
        this.currentIntersected = null;
      }
    });

    // Listen for raycaster-intersection-cleared event
    this.el.addEventListener("raycaster-intersection-cleared", (evt) => {
      if (this.highlighted) {
        this.unhighlightTarget(this.highlighted);
        this.highlighted = null;
        this.currentIntersected = null;
      }
    });
  },

  highlightAnimal: function (animalEl) {
    if (this.highlighted === animalEl) return;

    // Check if animal is already found - don't highlight with yellow if it is
    const controller = animalEl.components["animal-controller"];
    if (controller && controller.found) {
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

        // Add yellow highlight glow
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
    const controller = animalEl.components["animal-controller"];
    const isFound = controller && controller.found;

    // Restore materials
    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        const original = this.originalMaterials.get(node);

        if (!isFound && original) {
          // Restore original material for unfound animals
          if (original.emissive) {
            node.material.emissive.copy(original.emissive);
          } else if (node.material.emissive) {
            node.material.emissive.setHex(0x000000);
          }
          node.material.emissiveIntensity = original.emissiveIntensity;
        } else if (isFound) {
          // Keep green glow for found animals
          if (node.material.emissive) {
            node.material.emissive.setHex(0x00ff00); // Green glow
            node.material.emissiveIntensity = 0.8;
          }
        } else {
          // Fallback: reset to black
          if (node.material.emissive) {
            node.material.emissive.setHex(0x000000);
            node.material.emissiveIntensity = 0;
          }
        }
        node.material.needsUpdate = true;
      }
    });

    this.highlighted = null;
  },

  // Highlight billboard with yellow glow
  highlightBillboard: function (billboardEl) {
    if (this.highlighted === billboardEl) return;

    // Unhighlight previous
    if (this.highlighted && this.highlighted !== billboardEl) {
      this.unhighlightTarget(this.highlighted);
    }

    this.highlighted = billboardEl;

    // Find the plane element (billboard)
    const plane = billboardEl.querySelector("a-plane");
    if (!plane) return;

    // Store original material
    if (!this.originalMaterials.has(plane)) {
      const material = plane.getAttribute("material");
      this.originalMaterials.set(plane, { ...material });
    }

    // Apply yellow highlight
    const currentMaterial = plane.getAttribute("material");
    plane.setAttribute("material", {
      ...currentMaterial,
      emissive: "#ffff00",
      emissiveIntensity: 0.3,
    });
  },

  // Universal unhighlight method
  unhighlightTarget: function (targetEl) {
    if (!targetEl) {
      this.highlighted = null;
      return;
    }

    if (targetEl.classList.contains("animal")) {
      this.unhighlightAnimal(targetEl);
    } else if (targetEl.classList.contains("billboard")) {
      this.unhighlightBillboard(targetEl);
    }
  },

  // Unhighlight billboard
  unhighlightBillboard: function (billboardEl) {
    if (!billboardEl) {
      this.highlighted = null;
      return;
    }

    const plane = billboardEl.querySelector("a-plane");
    if (!plane) {
      this.highlighted = null;
      return;
    }

    // Restore original material
    const original = this.originalMaterials.get(plane);
    if (original) {
      plane.setAttribute("material", original);
    }

    this.highlighted = null;
  },
});
